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
    if (payment.status === 'released') throw alreadyReleased();
    if (order.status !== 'delivered') {
      throw new PaymentError(
        'conflict',
        'not_delivered_yet',
        'You can confirm once the driver has delivered the order',
      );
    }

    /* The stamp on the order is the claim: it can be taken once. The release then matches on the
       amount read above, so the sum that leaves is the sum this request decided on. */
    const received = await this.orders.markReceived(orderId, buyerId);
    if (!received) throw alreadyReleased();

    const released = await this.payments.release(
      orderId,
      newEntry('balance_release', payment.heldAmount, new Date()),
    );
    if (!released) throw alreadyReleased();
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
