import { Inject, Injectable } from '@nestjs/common';
import { Offer } from '../../domain/entities/offer';
import {
  OFFER_REPOSITORY,
  type OfferRepository,
} from '../../domain/repositories/offer.repository';

@Injectable()
export class ListOffersService {
  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly offerRepo: OfferRepository,
  ) {}

  async execute(userId: string, listingId: string): Promise<Offer[]> {
    const offers = await this.offerRepo.findByListingId(listingId);
    return offers.filter((o) => o.farmerId === userId || o.buyerId === userId);
  }
}
