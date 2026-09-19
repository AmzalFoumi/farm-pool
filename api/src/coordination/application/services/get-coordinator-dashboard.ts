import type { CoordinatorDashboard } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { toCooperativeDto } from '../../domain/entities/cooperative';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * What a coordinator sees for their cooperative: the group, its farmer count, and how many
 * verified listings it has. A coordinator with more than one cooperative sees the newest for
 * now — see `.plans/coordination/OPEN.md` #1, this is not assumed to stay a 1:1 relationship.
 *
 * A count, not the listings themselves — the per-listing detail belongs on a farmer's own
 * detail screen, not duplicated on the dashboard. Only `verified` listings count; pending ones
 * show up in `GetCoordinatorTasks` instead.
 */
export const DASHBOARD_LISTING_LIMIT = 200;

export class GetCoordinatorDashboard {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(coordinatorId: string): Promise<CoordinatorDashboard> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const listings = await this.listings.findVerified(
      { farmerIds: cooperative.memberFarmerIds },
      DASHBOARD_LISTING_LIMIT,
    );

    return {
      cooperative: toCooperativeDto(cooperative),
      farmerCount: cooperative.memberFarmerIds.length,
      listingCount: listings.length,
    };
  }
}
