import type { CreateOfferData, CropId } from '@farm-pool/shared';
import { Inject, Injectable } from '@nestjs/common';
import { LISTING_REPOSITORY } from '../../../catalog/domain/repositories/listing.repository';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { WANTED_REPOSITORY } from '../../../catalog/domain/repositories/wanted.repository';
import type { WantedRepository } from '../../../catalog/domain/repositories/wanted.repository';
import type { NewOffer, Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';

@Injectable()
export class CreateOfferService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(WANTED_REPOSITORY) private readonly wanteds: WantedRepository,
  ) {}

  async execute(
    requesterId: string,
    requesterRole: 'FARMER' | 'BUYER',
    data: CreateOfferData,
  ): Promise<Offer> {
    let buyerId: string;
    let farmerId: string;
    let cropId: CropId;

    if (data.listingType === 'STANDARD') {
      if (requesterRole !== 'BUYER') {
        throw new OfferError(
          'invalid',
          'invalid',
          'Only buyers can request standard listings',
        );
      }
      const listing = await this.listings.findById(data.listingId);
      if (!listing || listing.status !== 'verified') {
        throw new OfferError(
          'conflict',
          'conflict',
          'Listing is not available',
        );
      }
      buyerId = requesterId;
      farmerId = listing.farmerId;
      cropId = listing.cropId;
    } else {
      if (requesterRole !== 'FARMER') {
        throw new OfferError(
          'invalid',
          'invalid',
          'Only farmers can offer on wanted listings',
        );
      }
      const wanted = await this.wanteds.findById(data.listingId);
      if (!wanted || wanted.status !== 'open') {
        throw new OfferError(
          'conflict',
          'conflict',
          'Wanted request is not open',
        );
      }
      farmerId = requesterId;
      buyerId = wanted.buyerId;
      cropId = wanted.cropId;
    }

    const newOffer: NewOffer = {
      buyerId,
      farmerId,
      listingId: data.listingId,
      listingType: data.listingType,
      cropId,
      initiatedBy: requesterRole,
      pricePerKg: data.proposedPrice,
      quantityKg: data.proposedQuantityKg,
      total: data.proposedPrice * data.proposedQuantityKg,
      note: data.note,
      status: 'PENDING',
      actionRequiredBy: requesterRole === 'FARMER' ? 'BUYER' : 'FARMER',
      negotiationHistory: [
        {
          senderType: requesterRole,
          proposedPrice: data.proposedPrice,
          proposedQuantityKg: data.proposedQuantityKg,
          note: data.note,
          timestamp: new Date().toISOString(),
        },
      ],
      version: 0,
    };

    return this.offers.create(newOffer);
  }
}
