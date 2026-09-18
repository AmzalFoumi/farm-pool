import type { WantedListing } from '@farm-pool/shared';
import { toWantedListingDto } from '../../domain/entities/wanted-listing';
import type { WantedRepository } from '../../domain/repositories/wanted.repository';

const OPEN_LIMIT = 50;

/**
 * `mine` → the caller's own requests, any status (their "My requests" screen).
 * Otherwise → every open request, for farmers and coordinators looking at demand.
 */
export class ListWanted {
  constructor(private readonly wanted: WantedRepository) {}

  async execute(callerId: string, mine: boolean): Promise<WantedListing[]> {
    const found = mine
      ? await this.wanted.findByBuyer(callerId)
      : await this.wanted.findByStatus('open', OPEN_LIMIT);
    return found.map(toWantedListingDto);
  }
}
