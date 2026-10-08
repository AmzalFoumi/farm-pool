import type { CooperativeFarmer } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * Every member of the coordinator's cooperative, with their account status and how much they
 * currently have listed — the list the coordinator's Farmers screen and farmer detail screen
 * (FARM-44) both read from, no separate endpoint for the detail view. `district` prefers the one
 * the farmer named applying (`User.district`, FARM-44); a member who joined before that existed
 * falls back to their most recent listing's district, same as before.
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
      const district = member.district ?? mostRecent?.district;
      return {
        id: member.id,
        displayName: member.displayName,
        phone: member.phone,
        status: member.status,
        ...(district ? { district } : {}),
        listingCount: listings.length,
        createdAt: member.createdAt.toISOString(),
      };
    });
  }
}
