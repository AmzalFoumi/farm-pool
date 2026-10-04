import type { Payment } from '@farm-pool/shared';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { newEntry, toPaymentDto } from '../../domain/entities/payment';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentError } from '../errors';

/**
 * The buyer confirms the produce arrived, which releases the held balance to the farmer
 * (FARM-51). Only the buyer on the order; only once the driver has marked it `delivered`.
 *
 * The balance released is whatever is held at that moment — the agreed deal, including any price
 * renegotiated before pickup. It is not adjusted for a short load (`collectedKg`): a buyer who
 * received less than they paid for raises that as a dispute rather than quietly paying less.
 */
export class ConfirmReceipt {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
  ) {}

  async execute(buyerId: string, orderId: string): Promise<Payment> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new PaymentError(
        'not_found',
        'order_not_found',
        'This order does not exist',
      );
    }
    if (order.buyerId !== buyerId) {
      throw new PaymentError(
        'forbidden',
        'not_your_order',
        'Only the buyer who placed an order can confirm it arrived',
      );
    }
    const payment = await this.payments.findByOrder(orderId);
    if (!payment) {
      throw new PaymentError(
        'not_found',
        'payment_not_found',
        'This order has not been paid for yet',
      );
    }
    if (payment.status === 'released') {
      /* The money left on an earlier try but the stamp on the order did not land. Finish that
         try rather than refuse it: nothing more is paid, the order just catches up. */
      if (order.status === 'delivered' && order.receivedAt === undefined) {
        await this.orders.markReceived(orderId, buyerId);
        return toPaymentDto(payment);
      }
      throw alreadyReleased();
    }
    if (order.status !== 'delivered') {
      throw new PaymentError(
        'conflict',
        'not_delivered_yet',
        'You can confirm once the driver has delivered the order',
      );
    }

    /* The release is the claim: it matches on `in_escrow` and on the amount read above, so it can
       happen once and only for the sum this request decided on. The order is stamped after it.
       The other way round, a release that failed after the stamp would leave the balance held
       with no request able to release it. */
    const released = await this.payments.release(
      orderId,
      newEntry('balance_release', payment.heldAmount, new Date()),
    );
    if (!released) throw alreadyReleased();
    await this.orders.markReceived(orderId, buyerId);
    return toPaymentDto(released);
  }
}

function alreadyReleased(): PaymentError {
  return new PaymentError(
    'conflict',
    'already_released',
    'You have already confirmed this order arrived',
  );
}
