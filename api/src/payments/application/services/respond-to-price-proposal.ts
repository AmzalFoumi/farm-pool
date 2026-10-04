import {
  RENEGOTIABLE_ORDER_STATUSES,
  toCents,
  type Order,
} from '@farm-pool/shared';
import { toOrderDto } from '../../../orders/domain/entities/order';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { newEntry } from '../../domain/entities/payment';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentError } from '../errors';
import { assertCoversAdvance } from './propose-price';

/**
 * The answer to a proposed price (FARM-53).
 *
 * - **Decline** removes the proposal and changes nothing else. Either side may: for the side
 *   that proposed it, declining is withdrawing.
 * - **Accept** is only for the side that did *not* propose. The order takes the new price and
 *   total. If the buyer has already paid, the held balance moves by the difference, recorded as
 *   a `top_up` from the buyer (price went up) or a `refund` to them (price went down). The
 *   advance the farmer already has is untouched.
 */
export class RespondToPriceProposal {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRepository,
  ) {}

  async execute(
    callerId: string,
    orderId: string,
    answer: 'accept' | 'decline',
  ): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new PaymentError(
        'not_found',
        'order_not_found',
        'This order does not exist',
      );
    }
    const caller =
      callerId === order.buyerId
        ? 'buyer'
        : callerId === order.farmerId
          ? 'farmer'
          : null;
    if (!caller) {
      throw new PaymentError(
        'forbidden',
        'not_your_order',
        'Only the buyer and the farmer on an order can renegotiate it',
      );
    }
    const proposal = order.priceProposal;
    if (!proposal) throw noOpenProposal();

    if (answer === 'decline') {
      const cleared = await this.orders.resolvePriceProposal(
        orderId,
        proposal.proposedAt,
      );
      if (!cleared) throw noOpenProposal();
      return toOrderDto(cleared);
    }

    if (proposal.proposedBy === caller) {
      throw new PaymentError(
        'forbidden',
        'own_proposal',
        'The other side has to accept a price you proposed',
      );
    }
    if (!RENEGOTIABLE_ORDER_STATUSES.includes(order.status)) {
      throw new PaymentError(
        'conflict',
        'proposal_not_allowed',
        'The price can be changed only between acceptance and pickup',
      );
    }

    const newTotal = toCents(order.quantityKg * proposal.pricePerKg);
    await assertCoversAdvance(this.payments, orderId, newTotal);

    /* The order is claimed first, on the exact proposal read above and only while the price may
       still change. Whoever wins that claim is the one request allowed to move the money. */
    const repriced = await this.orders.resolvePriceProposal(
      orderId,
      proposal.proposedAt,
      { pricePerKg: proposal.pricePerKg, total: newTotal },
    );
    if (!repriced) throw noOpenProposal();

    /* The order now carries the new total, so the payment has to follow it. `adjust` refuses
       when the payment changed after it was read here; it is then read again and tried again,
       because by this point the caller has no proposal left to answer a second time. */
    for (let attempt = 0; attempt < ADJUST_ATTEMPTS; attempt += 1) {
      const payment = await this.payments.findByOrder(orderId);
      if (!payment || payment.total === newTotal) return toOrderDto(repriced);
      const difference = toCents(newTotal - payment.total);
      const adjusted = await this.payments.adjust(
        orderId,
        payment.heldAmount,
        {
          total: newTotal,
          heldAmount: toCents(payment.heldAmount + difference),
        },
        newEntry(
          difference > 0 ? 'top_up' : 'refund',
          Math.abs(difference),
          new Date(),
        ),
      );
      if (adjusted) return toOrderDto(repriced);
    }
    throw new PaymentError(
      'conflict',
      'payment_out_of_step',
      'The price changed, but the payment could not be updated to match. Please report this order',
    );
  }
}

/** How many times the held balance is read and moved before the request gives up. */
const ADJUST_ATTEMPTS = 3;

function noOpenProposal(): PaymentError {
  return new PaymentError(
    'conflict',
    'no_open_proposal',
    'There is no new price waiting for an answer on this order',
  );
}
