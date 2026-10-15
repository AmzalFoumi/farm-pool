import type { Listing } from '@farm-pool/shared';
import { toListingDto } from '../../../catalog/domain/entities/listing';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * A coordinator rejecting a listing one of their member farmers posted (FARM-43), with a
 * mandatory reason shown back to the farmer. The listing moves `pending_approval` → `rejected`.
 *
 * Unlike `RejectFarmer`, this does not remove anyone from the cooperative — rejecting a listing
 * is a judgement on that one submission, not on the farmer's membership.
 */
export class RejectListing {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(
    coordinatorId: string,
    listingId: string,
    reason: string,
  ): Promise<Listing> {
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

    const rejected = await this.listings.markRejectedIfPending(
      listingId,
      reason,
    );
    if (!rejected) {
      throw new CoordinationError(
        'conflict',
        'listing_not_pending',
        'This listing is not awaiting approval',
      );
    }
    return toListingDto(rejected);
  }
}
