import { Inject, Injectable } from '@nestjs/common';
import type { Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';

/** Every offer the caller is a side of — as the buyer or as the farmer — newest first. */
@Injectable()
export class ListMyOffersService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
  ) {}

  async execute(userId: string): Promise<Offer[]> {
    const [asBuyer, asFarmer] = await Promise.all([
      this.offers.findByBuyerId(userId),
      this.offers.findByFarmerId(userId),
    ]);
    return [...asBuyer, ...asFarmer].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
