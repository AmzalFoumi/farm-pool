import {
  toCents,
  type CreateOfferData,
  type SenderType,
} from '@farm-pool/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { Listing } from '../../../catalog/domain/entities/listing';
import { LISTING_REPOSITORY } from '../../../catalog/domain/repositories/listing.repository';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { WANTED_REPOSITORY } from '../../../catalog/domain/repositories/wanted.repository';
import type { WantedRepository } from '../../../catalog/domain/repositories/wanted.repository';
import { USER_REPOSITORY } from '../../../identity/domain/repositories/user.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { NewOffer, Offer } from '../../domain/entities/offer';
import { OFFER_REPOSITORY } from '../../domain/repositories/offer.repository';
import type { OfferRepository } from '../../domain/repositories/offer.repository';
import { OfferError } from '../errors';
import { assertQuantityFits } from '../quantity';

/**
 * Starts a negotiation. Two cases, decided by `listingType`:
 *
 * - STANDARD — a buyer proposes a price on a farmer's listing (FARM-46).
 * - WANTED — a farmer answers a buyer's wanted request from one of their own listings (FARM-47).
 *
 * In both, `listingId` is a real, verified listing. That is what lets an accepted offer become an
 * order the driver job board can read a pickup place from.
 */
@Injectable()
export class CreateOfferService {
  constructor(
    @Inject(OFFER_REPOSITORY) private readonly offers: OfferRepository,
    @Inject(LISTING_REPOSITORY) private readonly listings: ListingRepository,
    @Inject(WANTED_REPOSITORY) private readonly wanteds: WantedRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(
    requesterId: string,
    requesterRole: SenderType,
    data: CreateOfferData,
  ): Promise<Offer> {
    const starter: SenderType =
      data.listingType === 'WANTED' ? 'FARMER' : 'BUYER';
    if (requesterRole !== starter) {
      throw new OfferError(
        'invalid',
        'invalid',
        starter === 'BUYER'
          ? 'Only buyers can make an offer on a listing'
          : 'Only farmers can respond to a wanted request',
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

    const { buyerId, wantedId } =
      data.listingType === 'WANTED'
        ? await this.checkResponse(requesterId, listing, data)
        : this.checkOffer(requesterId, listing);

    assertQuantityFits(listing, data.proposedQuantityKg);

    const live = await this.offers.findActiveBetween({
      buyerId,
      farmerId: listing.farmerId,
      listingId: listing.id,
      ...(wantedId ? { wantedId } : {}),
    });
    if (live.length > 0) {
      throw new OfferError(
        'conflict',
        'offer_exists',
        wantedId
          ? 'You already have an open response to this request'
          : 'You already have an open offer on this listing',
      );
    }

    const buyer = await this.users.findById(buyerId);

    const newOffer: NewOffer = {
      buyerId,
      farmerId: listing.farmerId,
      listingId: listing.id,
      listingType: data.listingType,
      ...(wantedId ? { wantedId } : {}),
      cropId: listing.cropId,
      initiatedBy: starter,
      farmerName: listing.farmerName,
      ...(buyer ? { buyerName: buyer.displayName } : {}),
      pricePerKg: data.proposedPrice,
      quantityKg: data.proposedQuantityKg,
      total: toCents(data.proposedPrice * data.proposedQuantityKg),
      note: data.note,
      // The delivery point is the buyer's; a farmer's response cannot set one.
      ...(starter === 'BUYER' && data.dropOff ? { dropOff: data.dropOff } : {}),
      status: 'PENDING',
      actionRequiredBy: starter === 'BUYER' ? 'FARMER' : 'BUYER',
      negotiationHistory: [
        {
          senderType: starter,
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

  /** A buyer's offer on a listing: the farmer must be taking offers on it. */
  private checkOffer(
    buyerId: string,
    listing: Listing,
  ): { buyerId: string; wantedId?: undefined } {
    if (!listing.acceptNegotiation) {
      throw new OfferError(
        'conflict',
        'negotiation_not_accepted',
        'This farmer is not taking offers on this listing',
      );
    }
    return { buyerId };
  }

  /** A farmer's response: from their own listing, to an open request for the same crop. */
  private async checkResponse(
    farmerId: string,
    listing: Listing,
    data: CreateOfferData,
  ): Promise<{ buyerId: string; wantedId: string }> {
    if (listing.farmerId !== farmerId) {
      throw new OfferError(
        'forbidden',
        'not_your_listing',
        'You can only respond from one of your own listings',
      );
    }
    // The shared schema guarantees `wantedId` for WANTED; the `?? ''` only satisfies the type.
    const wanted = await this.wanteds.findById(data.wantedId ?? '');
    if (!wanted || wanted.status !== 'open') {
      throw new OfferError(
        'conflict',
        'wanted_closed',
        'This request is no longer open',
      );
    }
    if (wanted.cropId !== listing.cropId) {
      throw new OfferError(
        'invalid',
        'crop_mismatch',
        'Respond from a listing of the crop the buyer asked for',
      );
    }
    return { buyerId: wanted.buyerId, wantedId: wanted.id };
  }
}
