import { toCents, type SubmitNegotiationData } from '@farm-pool/shared';
import { Inject, Injectable } from '@nestjs/common';
import { sideOf, type Offer } from '../../domain/entities/offer';
import { LISTING_REPOSITORY } from '../../../catalog/domain/repositories/listing.repository';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';
import { assertQuantityFits } from '../quantity';

@Injectable()
export class SubmitNegotiationService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
  ) {}

  async execute(
    callerId: string,
    id: string,
    data: SubmitNegotiationData,
  ): Promise<Offer> {
    const offer = await this.offers.findById(id);
    if (!offer) {
      throw new OfferError('not_found', 'not_found', 'Offer not found');
    }
    /* The side comes from who is logged in. `data.senderType` is still accepted in the body but
       is not trusted. */
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
        'Offer is no longer negotiable',
      );
    }
    if (offer.actionRequiredBy !== side) {
      throw new OfferError(
        'invalid',
        'invalid',
        'It is not your turn to counter',
      );
    }

    const listing = await this.listings.findById(offer.listingId);
    if (!listing || listing.status !== 'verified') {
      throw new OfferError(
        'conflict',
        'listing_unavailable',
        'This listing is not available',
      );
    }
    assertQuantityFits(listing, data.proposedQuantityKg);

    offer.negotiationHistory.push({
      senderType: side,
      proposedPrice: data.proposedPrice,
      proposedQuantityKg: data.proposedQuantityKg,
      note: data.note,
      timestamp: new Date().toISOString(),
    });
    offer.pricePerKg = data.proposedPrice;
    offer.quantityKg = data.proposedQuantityKg;
    offer.total = toCents(data.proposedPrice * data.proposedQuantityKg);
    offer.note = data.note;
    // The delivery point is the buyer's to set. A farmer sending one changes nothing.
    if (side === 'BUYER' && data.dropOff) offer.dropOff = data.dropOff;
    offer.status = 'NEGOTIATING';
    offer.actionRequiredBy = side === 'FARMER' ? 'BUYER' : 'FARMER';
    offer.version += 1;

    await this.offers.save(offer);
    return offer;
  }
}
