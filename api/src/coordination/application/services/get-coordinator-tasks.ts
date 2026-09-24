import type { CoordinatorTask } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * "Needs you today": real, read-only items — farmers awaiting verification and listings
 * awaiting approval. Both are shown, neither is actionable yet (no approve/verify endpoint
 * exists — `.plans/coordination/OPEN.md` #5). A third kind, benchmark price not set, is in
 * Figma but has no collection behind it (`.plans/coordination/OPEN.md` #3), so it is not
 * produced here.
 */
export const TASK_LIMIT = 50;

export class GetCoordinatorTasks {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(coordinatorId: string): Promise<CoordinatorTask[]> {
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
    const pendingFarmers = allUsers.filter(
      (user) => memberIds.has(user.id) && user.status === 'pending_review',
    );

    const pendingListings = await this.listings.findPendingApproval(
      { farmerIds: [...memberIds] },
      TASK_LIMIT,
    );

    const farmerTasks: CoordinatorTask[] = pendingFarmers.map((farmer) => ({
      kind: 'verify_farmer',
      farmerId: farmer.id,
      farmerName: farmer.displayName,
    }));

    const listingTasks: CoordinatorTask[] = pendingListings.map((listing) => ({
      kind: 'approve_listing',
      listingId: listing.id,
      farmerName: listing.farmerName,
      cropId: listing.cropId,
      quantityKg: listing.quantityKg,
    }));

    return [...farmerTasks, ...listingTasks];
  }
}
