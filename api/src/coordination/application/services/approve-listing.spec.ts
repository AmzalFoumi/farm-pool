import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { ApproveListing } from './approve-listing';

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

describe('ApproveListing', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let listings: InMemoryListingRepository;
  let approve: ApproveListing;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    listings = new InMemoryListingRepository();
    approve = new ApproveListing(cooperatives, listings);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: ['farmer-1'],
    });
  });

  it('verifies a pending listing of a member farmer', async () => {
    const pending = await listings.seed({ ...fields });

    const result = await approve.execute('coord-1', pending.id);

    expect(result).toMatchObject({ id: pending.id, status: 'verified' });
    expect((await listings.findById(pending.id))?.status).toBe('verified');
  });

  it('refuses a coordinator with no cooperative', async () => {
    const pending = await listings.seed({ ...fields });
    await expect(approve.execute('nobody', pending.id)).rejects.toMatchObject({
      code: 'cooperative_not_found',
      kind: 'not_found',
    });
  });

  it('answers listing_not_found for a listing of a farmer outside the cooperative', async () => {
    const other = await listings.seed({ ...fields, farmerId: 'farmer-9' });
    await expect(approve.execute('coord-1', other.id)).rejects.toMatchObject({
      code: 'listing_not_found',
      kind: 'not_found',
    });
    expect((await listings.findById(other.id))?.status).toBe(
      'pending_approval',
    );
  });

  it('answers listing_not_found for an unknown id', async () => {
    await expect(approve.execute('coord-1', 'missing')).rejects.toMatchObject({
      code: 'listing_not_found',
    });
  });

  it('answers listing_not_pending the second time, and for a sold listing', async () => {
    const pending = await listings.seed({ ...fields });
    const sold = await listings.seed({ ...fields, status: 'sold' });

    await approve.execute('coord-1', pending.id);

    await expect(approve.execute('coord-1', pending.id)).rejects.toMatchObject({
      code: 'listing_not_pending',
      kind: 'conflict',
    });
    await expect(approve.execute('coord-1', sold.id)).rejects.toMatchObject({
      code: 'listing_not_pending',
    });
    expect((await listings.findById(sold.id))?.status).toBe('sold');
  });
});
