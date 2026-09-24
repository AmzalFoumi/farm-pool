import type { CropId } from '@farm-pool/shared';
import type { Listing, NewListing } from '../entities/listing';

export interface ListingFilter {
  crop?: CropId;
  /** Case-insensitive exact match on the district name. */
  district?: string;
  /** Only listings whose `farmerId` is in this set. Added for `coordination`'s dashboard. */
  farmerIds?: string[];
}

/**
 * "Something that can store listings." Use-cases see only this; the Mongoose implementation is
 * in `infrastructure/persistence/` and an in-memory one backs the unit tests.
 */
export interface ListingRepository {
  findById(id: string): Promise<Listing | null>;
  /** Only `verified` listings, newest first, at most `limit`. */
  findVerified(filter: ListingFilter, limit: number): Promise<Listing[]>;
  /** Only `pending_approval` listings, newest first, at most `limit`. Added for coordination's
   *  "Needs you today" — a coordinator's approval queue. */
  findPendingApproval(filter: ListingFilter, limit: number): Promise<Listing[]>;
  /** One farmer's listings in every status, newest first. Added for FARM-21's "My listings". */
  findByFarmerId(farmerId: string): Promise<Listing[]>;
  /** Farmer listing creation (FARM-21). */
  create(listing: NewListing): Promise<Listing>;
  upsertBySeedKey(seedKey: string, listing: NewListing): Promise<Listing>;
}

export const LISTING_REPOSITORY = Symbol('ListingRepository');
