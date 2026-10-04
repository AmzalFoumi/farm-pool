import { splitTotal, type Payment } from '@farm-pool/shared';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { isTaken, newEntry, toPaymentDto } from '../../domain/entities/payment';
import type { PaymentGateway } from '../../domain/gateways/payment-gateway';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentError } from '../errors';

/**
 * How long a `pending` claim blocks a second attempt. A claim older than this belongs to a
 * request that died part-way, and the next attempt takes it over. Far longer than any request
 * lives, so a claim that is still being worked on is never taken from under it.
 */
export const PENDING_CLAIM_TTL_MS = 10 * 60 * 1000;

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
 *
 * THE ORDER OF THE STEPS IS THE SAFETY. The payment record is written first, as `pending`, and
 * the unique index on `orderId` lets one request do that. Only that request charges. So two taps
 * on Pay cannot both take money, and every step after the charge that fails gives it back.
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

    const existing = await this.payments.findByOrder(orderId);
    if (existing && isTaken(existing)) {
      /* The money was taken on an earlier try but the order never opened. Finish that try
         rather than refuse it: nothing more is charged, the order just catches up. */
      if (existing.status === 'in_escrow' && order.status === 'accepted') {
        const opened = await this.orders.markPaid(
          orderId,
          buyerId,
          existing.total,
        );
        if (opened) return toPaymentDto(existing);
      }
      throw alreadyPaid();
    }
    if (existing) {
      const age = Date.now() - existing.createdAt.getTime();
      if (age < PENDING_CLAIM_TTL_MS) throw inProgress();
      await this.payments.discardPending(orderId);
    }
    if (order.status !== 'accepted') {
      throw notPayable();
    }

    const now = new Date();
    const { advanceAmount, heldAmount } = splitTotal(order.total);
    const claim = await this.payments.create({
      orderId,
      buyerId,
      farmerId: order.farmerId,
      total: order.total,
      advanceAmount,
      heldAmount,
      status: 'pending',
      method: this.gateway.method,
      entries: [
        newEntry('deposit', order.total, now),
        newEntry('advance_release', advanceAmount, now),
      ],
    });
    // Lost the race against a second tap: the storage holds one payment per order.
    if (!claim) throw inProgress();

    let reference: string;
    try {
      /* The key names the deal, not the attempt: a retry after a crash asks for the same charge
         again instead of a second one, and a repriced order is a new deal with a new key. */
      ({ reference } = await this.gateway.charge({
        orderId,
        buyerId,
        amount: order.total,
        idempotencyKey: `${orderId}:${order.total}`,
      }));
    } catch (error) {
      await this.payments.discardPending(orderId);
      throw error;
    }

    const payment = await this.payments.activate(orderId, reference);
    if (!payment) {
      // Only when this request outlived its own claim and another one took it over.
      await this.gateway.refund({ reference, amount: order.total });
      throw inProgress();
    }

    /* The order is claimed last, only from `accepted` and only at the total that was charged.
       If it moved or was repriced while the charge was in flight, the payment just written
       describes money for a deal that is no longer on, so the charge is given back and the
       payment is taken out rather than left holding. */
    const opened = await this.orders.markPaid(orderId, buyerId, order.total);
    if (!opened) {
      await this.gateway.refund({ reference, amount: order.total });
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

function inProgress(): PaymentError {
  return new PaymentError(
    'conflict',
    'payment_in_progress',
    'A payment for this order is already being taken. Try again in a moment',
  );
}

function notPayable(): PaymentError {
  return new PaymentError(
    'conflict',
    'order_not_payable',
    'This order can be paid only after the farmer accepts it',
  );
}
