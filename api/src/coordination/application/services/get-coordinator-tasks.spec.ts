import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryBenchmarkPriceRepository } from '../../infrastructure/persistence/in-memory-benchmark-price.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { GetCoordinatorTasks } from './get-coordinator-tasks';

const listingBase: NewListing = {
  farmerId: 'farmer-1',
  farmerName: 'Nimal',
  cropId: 'tomato',
  quantityKg: 100,
  pricePerKg: 180,
  harvestDate: '2026-09-20',
  district: 'Kurunegala',
  minOrderKg: 10,
  status: 'verified',
};

const priceBase = {
  cropId: 'tomato' as const,
  district: 'Kurunegala',
  lowPricePerKg: 150,
  highPricePerKg: 200,
  source: 'manual' as const,
  setByCoordinatorId: 'coord-1',
};

describe('GetCoordinatorTasks', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let users: InMemoryUserRepository;
  let listings: InMemoryListingRepository;
  let benchmarkPrices: InMemoryBenchmarkPriceRepository;
  let getCoordinatorTasks: GetCoordinatorTasks;

  beforeEach(() => {
    cooperatives = new InMemoryCooperativeRepository();
    users = new InMemoryUserRepository();
    listings = new InMemoryListingRepository();
    benchmarkPrices = new InMemoryBenchmarkPriceRepository();
    getCoordinatorTasks = new GetCoordinatorTasks(
      cooperatives,
      users,
      listings,
      benchmarkPrices,
    );
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(getCoordinatorTasks.execute('nobody')).rejects.toMatchObject({
      code: 'cooperative_not_found',
    });
  });

  it('returns nothing when there is nothing to do', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000001',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([]);
  });

  it('surfaces a pending-review member as verify_farmer', async () => {
    const farmer = await users.create({
      displayName: 'Ranjith',
      phone: '+94770000002',
      passwordHash: 'x',
      role: 'farmer',
      status: 'pending_review',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([
      { kind: 'verify_farmer', farmerId: farmer.id, farmerName: 'Ranjith' },
    ]);
  });

  it('does not surface a pending-review account outside the cooperative', async () => {
    await users.create({
      displayName: 'Someone Else',
      phone: '+94770000009',
      passwordHash: 'x',
      role: 'farmer',
      status: 'pending_review',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [],
    });

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([]);
  });

  it('surfaces a pending-approval listing as approve_listing', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000003',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });
    const listing = await listings.seed({
      ...listingBase,
      farmerId: farmer.id,
      status: 'pending_approval',
    });

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([
      {
        kind: 'approve_listing',
        listingId: listing.id,
        farmerName: 'Nimal',
        cropId: 'tomato',
        quantityKg: 100,
      },
    ]);
  });

  it('surfaces a crop with no price as benchmark_missing, only when a farmer actively sells it', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000004',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });
    await listings.seed({
      ...listingBase,
      farmerId: farmer.id,
      cropId: 'tomato',
    });

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([
      { kind: 'benchmark_missing', cropId: 'tomato' },
    ]);
  });

  it('does not surface a crop nobody is currently selling', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000005',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([]);
  });

  it('surfaces a priced crop older than the staleness window as benchmark_stale', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000006',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });
    await listings.seed({
      ...listingBase,
      farmerId: farmer.id,
      cropId: 'tomato',
    });
    const stalePublishedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await benchmarkPrices.seed(priceBase, stalePublishedAt);

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([
      {
        kind: 'benchmark_stale',
        cropId: 'tomato',
        publishedAt: stalePublishedAt.toISOString(),
      },
    ]);
  });

  it('does not surface a crop priced within the staleness window', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000007',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });
    await listings.seed({
      ...listingBase,
      farmerId: farmer.id,
      cropId: 'tomato',
    });
    await benchmarkPrices.seed(priceBase);

    expect(await getCoordinatorTasks.execute('coord-1')).toEqual([]);
  });
});
