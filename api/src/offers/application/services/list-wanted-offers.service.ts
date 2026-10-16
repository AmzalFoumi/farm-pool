import { Inject, Injectable } from '@nestjs/common';
import { sideOf, type Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';

/**
 * The responses to one wanted request, as the caller may see them: the buyer who posted the
 * request sees all of them; a farmer sees only their own. A farmer must not learn what another
 * farmer bid.
 */
@Injectable()
export class ListWantedOffersService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
  ) {}

  async execute(userId: string, wantedId: string): Promise<Offer[]> {
    const offers = await this.offers.findByWantedId(wantedId);
    return offers.filter((offer) => sideOf(offer, userId) !== null);
  }
}
