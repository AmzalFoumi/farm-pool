import type { Offer, NewOffer } from '../entities/offer';

/** The two people and the listing a negotiation is between — and, for a response to a wanted
 *  request, which request. With no `wantedId` it means "an ordinary offer on the listing". */
export interface OfferPair {
  buyerId: string;
  farmerId: string;
  listingId: string;
  wantedId?: string;
}

export interface OfferRepository {
  findById(id: string): Promise<Offer | null>;
  findActiveByListingId(
    listingId: string,
    excludeOfferId?: string,
  ): Promise<Offer[]>;
  findByListingId(listingId: string): Promise<Offer[]>;
  /** Every offer this user made or received as the buyer, newest first. */
  findByBuyerId(buyerId: string): Promise<Offer[]>;
  /** Every offer this user made or received as the farmer, newest first. */
  findByFarmerId(farmerId: string): Promise<Offer[]>;
  /** The `PENDING` and `NEGOTIATING` offers between this pair on this listing. Used to refuse a
   *  second live offer between the same two people. */
  findActiveBetween(pair: OfferPair): Promise<Offer[]>;
  /** Every response to this wanted request, newest first. */
  findByWantedId(wantedId: string): Promise<Offer[]>;
  /** The `PENDING` and `NEGOTIATING` responses to this wanted request. */
  findActiveByWantedId(
    wantedId: string,
    excludeOfferId?: string,
  ): Promise<Offer[]>;
  /**
   * Must guard on `version` to catch concurrent writes — throw OfferError('conflict', ...) on
   * mismatch. Caller is responsible for incrementing `offer.version` before calling this; it does
   * not do so implicitly.
   */
  save(offer: Offer): Promise<void>;
  create(offer: NewOffer): Promise<Offer>;
}

export const OFFER_REPOSITORY = Symbol('OfferRepository');
