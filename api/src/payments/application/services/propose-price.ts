import {
  RENEGOTIABLE_ORDER_STATUSES,
  type Order,
  type ProposePriceData,
} from '@farm-pool/shared';
import { toOrderDto } from '../../../orders/domain/entities/order';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentError } from '../errors';

/**
 * The buyer or the farmer puts a new price per kilo to the other side (FARM-53), for when the
 * market has moved between the order and the delivery.
 *
 * Nothing changes yet: the proposal sits on the order until the other side answers it. One at a
 * time, and only until the produce is on the vehicle — after pickup the deal is being carried
 * out, and a disagreement about it is a dispute, not a negotiation.
 *
 * Lives in this domain rather than in `orders` because accepting one moves held money, and
 * `orders` must not depend on `payments`.
 */
export class ProposePrice {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
  ) {}

  async execute(
    callerId: string,
    orderId: string,
    data: ProposePriceData,
  ): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new PaymentError(
        'not_found',
        'order_not_found',
        'This order does not exist',
      );
    }
    const proposedBy =
      callerId === order.buyerId
        ? 'buyer'
        : callerId === order.farmerId
          ? 'farmer'
          : null;
    if (!proposedBy) {
      throw new PaymentError(
        'forbidden',
        'not_your_order',
        'Only the buyer and the farmer on an order can renegotiate it',
      );
    }
    if (!RENEGOTIABLE_ORDER_STATUSES.includes(order.status)) {
      throw new PaymentError(
        'conflict',
        'proposal_not_allowed',
        'The price can be changed only between acceptance and pickup',
      );
    }
    if (order.priceProposal) throw proposalPending();
    if (data.pricePerKg === order.pricePerKg) {
      throw new PaymentError(
        'invalid',
        'price_unchanged',
        'That is already the price on this order',
      );
    }
    await assertCoversAdvance(
      this.payments,
      orderId,
      order.quantityKg * data.pricePerKg,
    );

    const updated = await this.orders.setPriceProposal(orderId, {
      proposedBy,
      pricePerKg: data.pricePerKg,
      ...(data.reason ? { reason: data.reason } : {}),
      proposedAt: new Date(),
    });
    // The other side proposed in the same moment, or the driver collected.
    if (!updated) throw proposalPending();
    return toOrderDto(updated);
  }
}

/**
 * The advance is already with the farmer and is never taken back, so a new total has to be at
 * least that much. Checked when a price is proposed and again when it is accepted.
 */
export async function assertCoversAdvance(
  payments: PaymentRepository,
  orderId: string,
  newTotal: number,
): Promise<void> {
  const payment = await payments.findByOrder(orderId);
  if (payment && newTotal < payment.advanceAmount) {
    throw new PaymentError(
      'invalid',
      'price_too_low',
      'The new total cannot be less than the advance the farmer already has',
    );
  }
}

function proposalPending(): PaymentError {
  return new PaymentError(
    'conflict',
    'proposal_pending',
    'A new price is already waiting for an answer on this order',
  );
}
