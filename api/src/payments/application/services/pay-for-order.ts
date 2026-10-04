import { splitTotal, type Payment } from '@farm-pool/shared';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { newEntry, toPaymentDto } from '../../domain/entities/payment';
import type { PaymentGateway } from '../../domain/gateways/payment-gateway';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentError } from '../errors';

/**
 * The buyer pays for an order the farmer has accepted (FARM-41).
 *
 * The whole total is taken once. The advance is released to the farmer in the same step and the
 * rest is held until the buyer confirms receipt. Paying is also what moves the order from
 * `accepted` to `open` — the status the driver job board reads — so a driver is never offered a
 * trip for produce nobody has paid for.
 *
 * The amount is the order's own total, never a number from the request: a client cannot name
 * what it pays any more than it can name its price.
 */
export class PayForOrder {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly gateway: PaymentGateway,
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
        'Only the buyer who placed an order can pay for it',
      );
    }
    if (await this.payments.findByOrder(orderId)) {
      throw alreadyPaid();
    }
    if (order.status !== 'accepted') {
      throw notPayable();
    }

    const { reference } = await this.gateway.charge({
      orderId,
      buyerId,
      amount: order.total,
    });

    const now = new Date();
    const { advanceAmount, heldAmount } = splitTotal(order.total);
    const payment = await this.payments.create({
      orderId,
      buyerId,
      farmerId: order.farmerId,
      total: order.total,
      advanceAmount,
      heldAmount,
      status: 'in_escrow',
      method: this.gateway.method,
      gatewayRef: reference,
      entries: [
        newEntry('deposit', order.total, now),
        newEntry('advance_release', advanceAmount, now),
      ],
    });
    // Lost the race against a second tap: the storage holds one payment per order.
    if (!payment) throw alreadyPaid();

    /* The order is claimed last, only from `accepted` and only at the total that was charged.
       If it moved or was repriced while the charge was in flight, the payment just written
       describes money for a deal that is no longer on, so it is taken back out rather than left
       holding. */
    const opened = await this.orders.markPaid(orderId, buyerId, order.total);
    if (!opened) {
      await this.payments.remove(payment.id);
      throw await this.whyNotPayable(orderId, order.total);
    }
    return toPaymentDto(payment);
  }

  /** A repriced order can be paid again at its new total; any other refusal is final. */
  private async whyNotPayable(
    orderId: string,
    chargedTotal: number,
  ): Promise<PaymentError> {
    const current = await this.orders.findById(orderId);
    if (current?.status === 'accepted' && current.total !== chargedTotal) {
      return new PaymentError(
        'conflict',
        'price_changed',
        'The price of this order has just changed. Check the new total and pay again',
      );
    }
    return notPayable();
  }
}

function alreadyPaid(): PaymentError {
  return new PaymentError(
    'conflict',
    'already_paid',
    'This order has already been paid for',
  );
}

function notPayable(): PaymentError {
  return new PaymentError(
    'conflict',
    'order_not_payable',
    'This order can be paid only after the farmer accepts it',
  );
}
