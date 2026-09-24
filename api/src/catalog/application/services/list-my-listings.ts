import type { Listing } from '@farm-pool/shared';
import { toListingDto } from '../../domain/entities/listing';
import type { ListingRepository } from '../../domain/repositories/listing.repository';

/**
 * A farmer's own listings, every status, newest first — "My listings". Unlike browse, this has to
 * include `pending_approval` and `rejected`: a farmer who has just posted needs to see the listing
 * waiting for approval. Scoped by the caller's id from the token, never by a query parameter, so
 * one farmer cannot read another's drafts.
 */
export class ListMyListings {
  constructor(private readonly listings: ListingRepository) {}

  async execute(farmerId: string): Promise<Listing[]> {
    const found = await this.listings.findByFarmerId(farmerId);
    return found.map(toListingDto);
  }
}
