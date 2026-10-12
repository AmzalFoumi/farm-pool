import {
  toCents,
  type CreateOfferData,
  type SenderType,
} from '@farm-pool/shared';
import { Inject, Injectable } from '@nestjs/common';
import { LISTING_REPOSITORY } from '../../../catalog/domain/repositories/listing.repository';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { USER_REPOSITORY } from '../../../identity/domain/repositories/user.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { NewOffer, Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';
import { assertQuantityFits } from '../quantity';

@Injectable()
export class CreateOfferService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    requesterId: string,
    requesterRole: SenderType,
    data: CreateOfferData,
  ): Promise<Offer> {
    /* Refused until FARM-47, which answers a wanted request from one of the farmer's own
       listings so the order still has a listing for the driver to read the pickup place from. */
    if (data.listingType === 'WANTED') {
      throw new OfferError(
        'conflict',
        'wanted_offers_unavailable',
        'Offers on a wanted request are not available yet',
      );
    }

    if (requesterRole !== 'BUYER') {
      throw new OfferError(
        'invalid',
        'invalid',
        'Only buyers can make an offer on a listing',
      );
    }

    const listing = await this.listings.findById(data.listingId);
    if (!listing || listing.status !== 'verified') {
      throw new OfferError(
        'conflict',
        'listing_unavailable',
        'This listing is not available',
      );
    }
    if (!listing.acceptNegotiation) {
      throw new OfferError(
        'conflict',
        'negotiation_not_accepted',
        'This farmer is not taking offers on this listing',
      );
    }
    assertQuantityFits(listing, data.proposedQuantityKg);

    const live = await this.offers.findActiveBetween({
      buyerId: requesterId,
      farmerId: listing.farmerId,
      listingId: listing.id,
    });
    if (live.length > 0) {
      throw new OfferError(
        'conflict',
        'offer_exists',
        'You already have an open offer on this listing',
      );
    }

    const buyer = await this.users.findById(requesterId);

    const newOffer: NewOffer = {
      buyerId: requesterId,
      farmerId: listing.farmerId,
      listingId: listing.id,
      listingType: 'STANDARD',
      cropId: listing.cropId,
      initiatedBy: 'BUYER',
      farmerName: listing.farmerName,
      ...(buyer ? { buyerName: buyer.displayName } : {}),
      pricePerKg: data.proposedPrice,
      quantityKg: data.proposedQuantityKg,
      total: toCents(data.proposedPrice * data.proposedQuantityKg),
      note: data.note,
      ...(data.dropOff ? { dropOff: data.dropOff } : {}),
      status: 'PENDING',
      actionRequiredBy: 'FARMER',
      negotiationHistory: [
        {
          senderType: 'BUYER',
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
