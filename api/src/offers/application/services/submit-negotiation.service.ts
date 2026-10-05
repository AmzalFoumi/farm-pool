import type { SubmitNegotiationData } from '@farm-pool/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';

@Injectable()
export class SubmitNegotiationService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
  ) {}

  async execute(id: string, data: SubmitNegotiationData): Promise<Offer> {
    const offer = await this.offers.findById(id);
    if (!offer) {
      throw new OfferError('not_found', 'not_found', 'Offer not found');
    }

    if (offer.status !== 'PENDING' && offer.status !== 'NEGOTIATING') {
      throw new OfferError(
        'invalid',
        'invalid',
        'Offer is no longer negotiable',
      );
    }
    if (offer.actionRequiredBy !== data.senderType) {
      throw new OfferError(
        'invalid',
        'invalid',
        'It is not your turn to counter',
      );
    }

    offer.negotiationHistory.push({
      senderType: data.senderType,
      proposedPrice: data.proposedPrice,
      proposedQuantityKg: data.proposedQuantityKg,
      note: data.note,
      timestamp: new Date().toISOString(),
    });
    offer.pricePerKg = data.proposedPrice;
    offer.quantityKg = data.proposedQuantityKg;
    offer.total = data.proposedPrice * data.proposedQuantityKg;
    offer.note = data.note;
    offer.status = 'NEGOTIATING';
    offer.actionRequiredBy = data.senderType === 'FARMER' ? 'BUYER' : 'FARMER';
    offer.version += 1;

    await this.offers.save(offer);
    return offer;
  }
}
