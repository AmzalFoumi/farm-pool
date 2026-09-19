import type { CropId } from '@farm-pool/shared';
import type { Listing, NewListing } from '../entities/listing';

export interface ListingFilter {
  crop?: CropId;
  /** Case-insensitive exact match on the district name. */
  district?: string;
  farmerId?: string;
}

/**
 * "Something that can store listings." Use-cases see only this; the Mongoose implementation is
 * in `infrastructure/persistence/` and an in-memory one backs the unit tests.
 */
export interface ListingRepository {
  findById(id: string): Promise<Listing | null>;
  /** Only `verified` listings, newest first, at most `limit`. */
  findVerified(filter: ListingFilter, limit: number): Promise<Listing[]>;
  findByFarmerId(farmerId: string): Promise<Listing[]>;
  create(listing: NewListing): Promise<Listing>;
  upsertBySeedKey(seedKey: string, listing: NewListing): Promise<Listing>;
}

export const LISTING_REPOSITORY = Symbol('ListingRepository');
