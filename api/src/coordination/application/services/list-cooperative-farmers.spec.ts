import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { ListCooperativeFarmers } from './list-cooperative-farmers';

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

describe('ListCooperativeFarmers', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let users: InMemoryUserRepository;
  let listings: InMemoryListingRepository;
  let listCooperativeFarmers: ListCooperativeFarmers;

  beforeEach(() => {
    cooperatives = new InMemoryCooperativeRepository();
    users = new InMemoryUserRepository();
    listings = new InMemoryListingRepository();
    listCooperativeFarmers = new ListCooperativeFarmers(
      cooperatives,
      users,
      listings,
    );
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(
      listCooperativeFarmers.execute('nobody'),
    ).rejects.toMatchObject({ code: 'cooperative_not_found' });
  });

  it('includes phone and registration date, for verifying a pending farmer (FARM-44)', async () => {
    const farmer = await users.create({
      displayName: 'Ranjith',
      phone: '+94770000001',
      passwordHash: 'x',
      role: 'farmer',
      status: 'pending_review',
    });
    await users.saveFarmerDistrict(farmer.id, 'Kurunegala');
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });

    const [result] = await listCooperativeFarmers.execute('coord-1');

    expect(result).toMatchObject({
      id: farmer.id,
      displayName: 'Ranjith',
      phone: '+94770000001',
      status: 'pending_review',
      district: 'Kurunegala',
      listingCount: 0,
    });
    expect(typeof result.createdAt).toBe('string');
  });

  it('prefers the farmer’s own district over a listing’s (FARM-44)', async () => {
    const farmer = await users.create({
      displayName: 'Nimal',
      phone: '+94770000002',
      passwordHash: 'x',
      role: 'farmer',
      status: 'active',
    });
    await users.saveFarmerDistrict(farmer.id, 'Kurunegala');
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Coop',
      district: 'Kurunegala',
      memberFarmerIds: [farmer.id],
    });
    await listings.seed({
      ...listingBase,
      farmerId: farmer.id,
      district: 'Puttalam',
    });

    const [result] = await listCooperativeFarmers.execute('coord-1');

    expect(result.district).toBe('Kurunegala');
    expect(result.listingCount).toBe(1);
  });

  it('falls back to the most recent listing’s district when the farmer has none stored', async () => {
    const farmer = await users.create({
      displayName: 'Kamala',
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
    await listings.seed({
      ...listingBase,
      farmerId: farmer.id,
      district: 'Puttalam',
    });

    const [result] = await listCooperativeFarmers.execute('coord-1');

    expect(result.district).toBe('Puttalam');
  });

  it('leaves district absent for a member with neither their own nor a listing one', async () => {
    const farmer = await users.create({
      displayName: 'Sunil',
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

    const [result] = await listCooperativeFarmers.execute('coord-1');

    expect(result.district).toBeUndefined();
    expect(result.listingCount).toBe(0);
  });
});
