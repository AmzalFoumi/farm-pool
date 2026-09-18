import type { Listing } from '@farm-pool/shared';
import { toListingDto } from '../../domain/entities/listing';
import type { ListingRepository } from '../../domain/repositories/listing.repository';
import { CatalogError } from '../errors';

/**
 * One listing for the detail screen. Anything that is not `verified` is "not found" to a buyer:
 * a draft or a rejected listing must not be reachable by guessing its id.
 */
export class GetListing {
  constructor(private readonly listings: ListingRepository) {}

  async execute(id: string): Promise<Listing> {
    const listing = await this.listings.findById(id);
    if (!listing || listing.status !== 'verified') {
      throw new CatalogError(
        'not_found',
        'listing_not_found',
        'This listing is no longer available',
      );
    }
    return toListingDto(listing);
  }
}
