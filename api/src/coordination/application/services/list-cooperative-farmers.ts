import type { CooperativeFarmer } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * Every member of the coordinator's cooperative, with their account status and how much they
 * currently have listed. `district` is the farmer's most recent listing's district — `User`
 * carries no location of its own, so a member with no listings yet has none.
 */
export class ListCooperativeFarmers {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(coordinatorId: string): Promise<CooperativeFarmer[]> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const memberIds = new Set(cooperative.memberFarmerIds);
    const allUsers = await this.users.findAll();
    const members = allUsers.filter((user) => memberIds.has(user.id));

    // Verified listings only — the same scope the dashboard uses, and the only read
    // `ListingRepository` exposes beyond a single lookup. A farmer with only a pending or
    // rejected listing shows a zero count and no district until one clears review.
    const memberListings = await this.listings.findVerified(
      { farmerIds: [...memberIds] },
      1000,
    );

    return members.map((member) => {
      const listings = memberListings.filter((l) => l.farmerId === member.id);
      const mostRecent = listings[0];
      return {
        id: member.id,
        displayName: member.displayName,
        status: member.status,
        ...(mostRecent ? { district: mostRecent.district } : {}),
        listingCount: listings.length,
      };
    });
  }
}
