import type { Listing } from '@farm-pool/shared';
import { toListingDto } from '../../../catalog/domain/entities/listing';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * A coordinator approving a listing one of their member farmers posted (FARM-43). The listing
 * moves `pending_approval` → `verified`, which is what makes it visible to buyers.
 *
 * A listing of a farmer outside this coordinator's cooperative is answered as "not found", the
 * same way `ApproveFarmer` treats a farmer who is not a member: a coordinator must not learn that
 * someone else's listing exists.
 */
export class ApproveListing {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(coordinatorId: string, listingId: string): Promise<Listing> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const listing = await this.listings.findById(listingId);
    if (!listing || !cooperative.memberFarmerIds.includes(listing.farmerId)) {
      throw new CoordinationError(
        'not_found',
        'listing_not_found',
        'This listing is not from a farmer in your cooperative',
      );
    }

    const verified = await this.listings.markVerifiedIfPending(listingId);
    if (!verified) {
      throw new CoordinationError(
        'conflict',
        'listing_not_pending',
        'This listing is not awaiting approval',
      );
    }
    return toListingDto(verified);
  }
}
