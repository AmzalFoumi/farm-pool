import { Inject, Injectable } from '@nestjs/common';
import { sideOf, type Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';

/** One offer, for its buyer or its farmer. */
@Injectable()
export class GetOfferService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
  ) {}

  async execute(userId: string, offerId: string): Promise<Offer> {
    const offer = await this.offers.findById(offerId);
    if (!offer) {
      throw new OfferError('not_found', 'not_found', 'Offer not found');
    }
    if (!sideOf(offer, userId)) {
      throw new OfferError(
        'forbidden',
        'not_your_offer',
        'Only the buyer and the farmer on an offer can see it',
      );
    }
    return offer;
  }
}
