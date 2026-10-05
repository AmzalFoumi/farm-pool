import type { Offer, NewOffer } from '../entities/offer';

export interface OfferRepository {
  findById(id: string): Promise<Offer | null>;
  findActiveByListingId(
    listingId: string,
    excludeOfferId?: string,
  ): Promise<Offer[]>;
  findByListingId(listingId: string): Promise<Offer[]>;
  /**
   * Must guard on `version` to catch concurrent writes — throw OfferError('conflict', ...) on
   * mismatch. Caller is responsible for incrementing `offer.version` before calling this; it does
   * not do so implicitly.
   */
  save(offer: Offer): Promise<void>;
  create(offer: NewOffer): Promise<Offer>;
}

export const OFFER_REPOSITORY = Symbol('OfferRepository');
