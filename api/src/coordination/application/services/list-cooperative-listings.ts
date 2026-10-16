import type { Listing } from '@farm-pool/shared';
import { toListingDto } from '../../../catalog/domain/entities/listing';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * Every listing from this coordinator's cooperative farmers, any status except `draft` (FARM-43).
 * The coordinator's "Listings" tab — a wider view than `GetCoordinatorTasks`' pending-only queue.
 */
export class ListCooperativeListings {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(coordinatorId: string): Promise<Listing[]> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const listings = await this.listings.findByFarmerIds(
      { farmerIds: cooperative.memberFarmerIds },
      1000,
    );
    return listings.map(toListingDto);
  }
}
