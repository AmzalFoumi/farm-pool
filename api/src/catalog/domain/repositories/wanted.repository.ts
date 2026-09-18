import type { WantedStatus } from '@farm-pool/shared';
import type {
  NewWantedListing,
  WantedListing,
} from '../entities/wanted-listing';

export interface WantedRepository {
  create(wanted: NewWantedListing): Promise<WantedListing>;
  findById(id: string): Promise<WantedListing | null>;
  /** One buyer's requests, newest first. */
  findByBuyer(buyerId: string): Promise<WantedListing[]>;
  /** Every request with this status, newest first, at most `limit`. */
  findByStatus(status: WantedStatus, limit: number): Promise<WantedListing[]>;
  updateStatus(id: string, status: WantedStatus): Promise<WantedListing>;
}

export const WANTED_REPOSITORY = Symbol('WantedRepository');
