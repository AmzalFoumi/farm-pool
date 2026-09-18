import type { Listing, ListingQuery } from '@farm-pool/shared';
import { toListingDto } from '../../domain/entities/listing';
import type { ListingRepository } from '../../domain/repositories/listing.repository';

/** The most a browse request returns. Pagination is a later story; 50 covers a pilot district. */
export const BROWSE_LIMIT = 50;

/** What a buyer browses: verified listings only, newest first, optionally by crop and district. */
export class ListListings {
  constructor(private readonly listings: ListingRepository) {}

  async execute(query: ListingQuery): Promise<Listing[]> {
    const found = await this.listings.findVerified(
      { crop: query.crop, district: query.district },
      BROWSE_LIMIT,
    );
    return found.map(toListingDto);
  }
}
