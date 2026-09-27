import { isBenchmarkPriceStale, type CoordinatorTask } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { BenchmarkPriceRepository } from '../../domain/repositories/benchmark-price.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * "Needs you today": real items a coordinator should look at. `verify_farmer` and
 * `approve_listing` are read-only (no approve/verify endpoint exists yet —
 * `.plans/coordination/OPEN.md` #5). `benchmark_missing` and `benchmark_stale` (FARM-37) are real
 * writes, one row per crop their own farmers are actively selling that has no price at all, or
 * one older than `isBenchmarkPriceStale` allows — a crop nobody sells yet is not a task.
 */
export const TASK_LIMIT = 50;
const LISTING_SAMPLE_LIMIT = 1000;

export class GetCoordinatorTasks {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
    private readonly benchmarkPrices: BenchmarkPriceRepository,
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

    const [pendingListings, activeListings, prices] = await Promise.all([
      this.listings.findPendingApproval(
        { farmerIds: [...memberIds] },
        TASK_LIMIT,
      ),
      this.listings.findVerified(
        { farmerIds: [...memberIds] },
        LISTING_SAMPLE_LIMIT,
      ),
      this.benchmarkPrices.findCurrentByDistrict(cooperative.district),
    ]);

    const priceByCrop = new Map(prices.map((price) => [price.cropId, price]));
    const cropsInUse = new Set(activeListings.map((listing) => listing.cropId));

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

    const benchmarkTasks: CoordinatorTask[] = [...cropsInUse].flatMap(
      (cropId): CoordinatorTask[] => {
        const price = priceByCrop.get(cropId);
        if (!price) return [{ kind: 'benchmark_missing', cropId }];
        if (isBenchmarkPriceStale(price.publishedAt.toISOString())) {
          return [
            {
              kind: 'benchmark_stale',
              cropId,
              publishedAt: price.publishedAt.toISOString(),
            },
          ];
        }
        return [];
      },
    );

    return [...farmerTasks, ...listingTasks, ...benchmarkTasks];
  }
}
