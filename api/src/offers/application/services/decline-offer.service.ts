import { Inject, Injectable } from '@nestjs/common';
import type { Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';

@Injectable()
export class DeclineOfferService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
  ) {}

  async execute(id: string): Promise<Offer> {
    const offer = await this.offers.findById(id);
    if (!offer) {
      throw new OfferError('not_found', 'not_found', 'Offer not found');
    }

    if (offer.status !== 'PENDING' && offer.status !== 'NEGOTIATING') {
      throw new OfferError(
        'invalid',
        'invalid',
        'Offer cannot be declined in its current state',
      );
    }

    offer.status = 'DECLINED';
    offer.version += 1;
    await this.offers.save(offer);
    return offer;
  }
}
