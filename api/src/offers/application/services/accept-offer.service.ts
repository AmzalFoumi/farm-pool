import type { AcceptOfferData, OfferStatus } from '@farm-pool/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { LISTING_REPOSITORY } from '../../../catalog/domain/repositories/listing.repository';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { WANTED_REPOSITORY } from '../../../catalog/domain/repositories/wanted.repository';
import type { WantedRepository } from '../../../catalog/domain/repositories/wanted.repository';
import { PlaceOrder } from '../../../orders/application/services/place-order';
import type { Order } from '@farm-pool/shared';
import { sideOf, type Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';

@Injectable()
export class AcceptOfferService {
  private readonly logger = new Logger(AcceptOfferService.name);

  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(WANTED_REPOSITORY) private readonly wanteds: WantedRepository,
    private readonly placeOrder: PlaceOrder,
  ) {}

  async execute(
    callerId: string,
    offerId: string,
    data: AcceptOfferData = {},
  ): Promise<{ orderId: string }> {
    const offer = await this.offers.findById(offerId);
    if (!offer) {
      throw new OfferError('not_found', 'not_found', 'Offer not found');
    }
    const side = sideOf(offer, callerId);
    if (!side) {
      throw new OfferError(
        'forbidden',
        'not_your_offer',
        'Only the buyer and the farmer on an offer can answer it',
      );
    }

    if (offer.status !== 'PENDING' && offer.status !== 'NEGOTIATING') {
      throw new OfferError(
        'invalid',
        'invalid',
        'Offer cannot be accepted in its current state',
      );
    }

    // The side that made the latest proposal cannot accept it for the other side.
    if (offer.actionRequiredBy !== side) {
      throw new OfferError(
        'invalid',
        'invalid',
        'The other side has to accept this offer',
      );
    }

    // The delivery point is the buyer's to set. It is saved with the status change below.
    if (side === 'BUYER' && data.dropOff) offer.dropOff = data.dropOff;

    const previousStatus = offer.status;
    offer.status = 'ACCEPTED';
    offer.version += 1;
    await this.offers.save(offer); // Step 1

    /* Step 2 — claim, in two atomic steps. A response to a wanted request closes the request
       first, so two responses to one request cannot both win. Then the stock is taken from the
       listing, exactly as for an ordinary offer. */
    if (offer.wantedId) {
      const closed = await this.wanteds.markClosedIfOpen(offer.wantedId);
      if (!closed) {
        await this.revertOffer(offer, previousStatus);
        throw new OfferError(
          'conflict',
          'wanted_closed',
          'This request is no longer open',
        );
      }
    }

    const reserved = await this.listings.deductQuantity(
      offer.listingId,
      offer.quantityKg,
    );
    if (!reserved) {
      if (offer.wantedId) {
        await this.wanteds.updateStatus(offer.wantedId, 'open');
      }
      await this.revertOffer(offer, previousStatus);
      throw new OfferError(
        'conflict',
        'insufficient_stock',
        'Not enough quantity available',
      );
    }

    let order: Order;
    try {
      order = await this.placeOrder.executeFromOffer(offer); // Step 3 — uses negotiated price
    } catch (err) {
      await this.revertListing(offer); // safe: Step 2 already atomically claimed it, no race here
      await this.revertOffer(offer, previousStatus);
      throw err;
    }

    offer.orderId = order.id;
    offer.version += 1;
    try {
      await this.offers.save(offer); // Step 4
    } catch (err) {
      this.logger.error(
        `Offer ${offer.id} accepted order ${order.id} but failed to link back`,
        err,
      );
      // Order is already valid and authoritative; this is a traceability gap only
    }

    /* Step 5 — a wanted request is filled once: decline the other live responses to it. Keyed on
       the request, never on the listing, so ordinary offers on the same listing stay live. */
    if (offer.wantedId) {
      const siblings = await this.offers.findActiveByWantedId(
        offer.wantedId,
        offer.id,
      );
      for (const sibling of siblings) {
        try {
          sibling.status = 'DECLINED';
          sibling.version += 1;
          await this.offers.save(sibling);
        } catch (err) {
          this.logger.error(
            `Failed to auto-decline sibling offer ${sibling.id}`,
            err,
          );
        }
      }
    }

    return { orderId: order.id };
  }

  private async revertOffer(offer: Offer, previousStatus: OfferStatus) {
    offer.status = previousStatus;
    offer.version += 1;
    await this.offers.save(offer);
  }

  /** Undo step 2: give the stock back, and reopen the request if this was a response to one. */
  private async revertListing(offer: Offer) {
    await this.listings.refundQuantity(offer.listingId, offer.quantityKg);
    if (offer.wantedId) {
      await this.wanteds.updateStatus(offer.wantedId, 'open');
    }
  }
}
// Known, accepted limitation (leave as a code comment, not something to solve now): Steps 1/3/4/5 aren't wrapped in a shared transaction. If the process crashes between Step 2 succeeding and Step 4 completing, you can get Offer.status === "ACCEPTED" with orderId unset even though the listing was already claimed and the Order genuinely exists. This needs a manual reconciliation sweep eventually (see expire-offers.service.ts below) — not expected in practice, accepted tradeoff given no cross-repository transaction support in this architecture.
