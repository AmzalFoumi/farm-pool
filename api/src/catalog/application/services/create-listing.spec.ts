import { pickupPointSchema } from '@farm-pool/shared';
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

  it('sets no minimum order (1 kg) when the farmer gives none', async () => {
    expect((await create.execute(farmerId, data)).minOrderKg).toBe(1);
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

/**
 * The farm gate (FARM-26). A driver navigates by this, so the two failures worth testing are a
 * coordinate that survives the round trip unchanged, and a transposed pair being refused rather
 * than stored — latitude 80 / longitude 7 is a valid-looking point in Kazakhstan.
 */
describe('CreateListing pickup point', () => {
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
      phone: '+94771000002',
      passwordHash: 'hash',
      role: 'farmer',
    });
    farmerId = farmer.id;
  });

  it('stores the gate the farmer pinned, unchanged', async () => {
    const pickupPoint = { latitude: 7.6281, longitude: 80.2447 };

    const listing = await create.execute(farmerId, { ...data, pickupPoint });

    expect(listing.pickupPoint).toEqual(pickupPoint);
  });

  it('leaves it absent when the farmer did not pin one', async () => {
    const listing = await create.execute(farmerId, data);

    expect(listing.pickupPoint).toBeUndefined();
  });

  it('refuses a transposed pair rather than sending a driver to Kazakhstan', () => {
    const transposed = pickupPointSchema.safeParse({
      latitude: 80.2447,
      longitude: 7.6281,
    });

    expect(transposed.success).toBe(false);
  });

  it('accepts points across the island, from Jaffna to Hambantota', () => {
    for (const point of [
      { latitude: 9.6615, longitude: 80.0255 },
      { latitude: 6.1429, longitude: 81.1212 },
      { latitude: 6.9271, longitude: 79.8612 },
    ]) {
      expect(pickupPointSchema.safeParse(point).success).toBe(true);
    }
  });
});
