import type { CreateListingData } from '@farm-pool/shared';
import { InMemoryUserRepository } from '../../../identity/infrastructure/persistence/in-memory-user.repository';
import { InMemoryListingRepository } from '../../infrastructure/persistence/in-memory-listing.repository';
import { CreateListing } from './create-listing';
import { ListMyListings } from './list-my-listings';

const data: CreateListingData = {
  cropId: 'tomato',
  quantityKg: 250,
  unit: 'crates',
  variety: 'Roma',
  certifications: ['Organic Certified'],
  pricePerKg: 180,
  harvestDate: '2026-09-25',
  district: 'Kurunegala',
  fulfillmentOption: 'shared',
};

describe('CreateListing', () => {
  let listings: InMemoryListingRepository;
  let users: InMemoryUserRepository;
  let create: CreateListing;
  let farmerId: string;

  beforeEach(async () => {
    listings = new InMemoryListingRepository();
    users = new InMemoryUserRepository();
    create = new CreateListing(listings, users);
    const farmer = await users.create({
      displayName: 'Nimal Perera',
      phone: '+94771000001',
      passwordHash: 'hash',
      role: 'farmer',
    });
    farmerId = farmer.id;
  });

  it("copies the farmer's name from the account and starts pending approval", async () => {
    const listing = await create.execute(farmerId, data);

    expect(listing).toMatchObject({
      farmerId,
      farmerName: 'Nimal Perera',
      status: 'pending_approval',
    });
  });

  it('keeps every optional field the farmer sent', async () => {
    const listing = await create.execute(farmerId, data);
    const stored = await listings.findById(listing.id);

    expect(stored).toMatchObject({
      unit: 'crates',
      variety: 'Roma',
      certifications: ['Organic Certified'],
      fulfillmentOption: 'shared',
    });
  });

  it('defaults the minimum order to 100 kg, or the whole quantity if smaller', async () => {
    expect((await create.execute(farmerId, data)).minOrderKg).toBe(100);
    expect(
      (await create.execute(farmerId, { ...data, quantityKg: 40 })).minOrderKg,
    ).toBe(40);
  });

  it('refuses with farmer_not_found for an account that no longer exists', async () => {
    await expect(create.execute('gone', data)).rejects.toMatchObject({
      kind: 'not_found',
      code: 'farmer_not_found',
    });
  });
});

describe('ListMyListings', () => {
  it("returns only the caller's listings, in every status, newest first", async () => {
    const listings = new InMemoryListingRepository();
    const base = {
      farmerId: 'farmer-1',
      farmerName: 'Nimal',
      cropId: 'tomato' as const,
      quantityKg: 100,
      pricePerKg: 180,
      harvestDate: '2026-09-20',
      district: 'Kurunegala',
      minOrderKg: 10,
    };
    await listings.seed(
      { ...base, status: 'verified' },
      new Date('2026-09-01'),
    );
    await listings.seed(
      { ...base, status: 'pending_approval' },
      new Date('2026-09-03'),
    );
    await listings.seed(
      { ...base, farmerId: 'farmer-2', status: 'pending_approval' },
      new Date('2026-09-04'),
    );

    const mine = await new ListMyListings(listings).execute('farmer-1');

    expect(mine.map((l) => l.status)).toEqual(['pending_approval', 'verified']);
  });
});
