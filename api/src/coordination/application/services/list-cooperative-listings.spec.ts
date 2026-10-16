import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { ListCooperativeListings } from './list-cooperative-listings';

const fields: NewListing = {
  farmerId: 'farmer-1',
  farmerName: 'Nimal',
  cropId: 'tomato',
  quantityKg: 100,
  pricePerKg: 180,
  harvestDate: '2026-09-20',
  district: 'Kurunegala',
  minOrderKg: 10,
  status: 'pending_approval',
};

describe('ListCooperativeListings', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let listings: InMemoryListingRepository;
  let listCooperativeListings: ListCooperativeListings;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    listings = new InMemoryListingRepository();
    listCooperativeListings = new ListCooperativeListings(
      cooperatives,
      listings,
    );
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: ['farmer-1'],
    });
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(
      listCooperativeListings.execute('nobody'),
    ).rejects.toMatchObject({ code: 'cooperative_not_found' });
  });

  it('returns every non-draft listing of a member farmer', async () => {
    const pending = await listings.seed({ ...fields });
    const verified = await listings.seed({ ...fields, status: 'verified' });
    const rejected = await listings.seed({
      ...fields,
      status: 'rejected',
      rejectionReason: 'Photos too blurry',
    });

    const result = await listCooperativeListings.execute('coord-1');

    expect(result.map((l) => l.id).sort()).toEqual(
      [pending.id, verified.id, rejected.id].sort(),
    );
    expect(result.find((l) => l.id === rejected.id)?.rejectionReason).toBe(
      'Photos too blurry',
    );
  });

  it('excludes a draft listing', async () => {
    await listings.seed({ ...fields, status: 'draft' });

    const result = await listCooperativeListings.execute('coord-1');

    expect(result).toHaveLength(0);
  });

  it('excludes a listing from a farmer outside the cooperative', async () => {
    await listings.seed({ ...fields, farmerId: 'farmer-9' });

    const result = await listCooperativeListings.execute('coord-1');

    expect(result).toHaveLength(0);
  });
});
