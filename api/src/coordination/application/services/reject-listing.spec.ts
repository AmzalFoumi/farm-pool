import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import { RejectListing } from './reject-listing';

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

describe('RejectListing', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let listings: InMemoryListingRepository;
  let reject: RejectListing;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    listings = new InMemoryListingRepository();
    reject = new RejectListing(cooperatives, listings);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: ['farmer-1'],
    });
  });

  it('rejects a pending listing of a member farmer, recording the reason', async () => {
    const pending = await listings.seed({ ...fields });

    const result = await reject.execute(
      'coord-1',
      pending.id,
      'Photos too blurry to verify quality',
    );

    expect(result).toMatchObject({
      id: pending.id,
      status: 'rejected',
      rejectionReason: 'Photos too blurry to verify quality',
    });
    expect(await listings.findById(pending.id)).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Photos too blurry to verify quality',
    });
  });

  it('refuses a coordinator with no cooperative', async () => {
    const pending = await listings.seed({ ...fields });
    await expect(
      reject.execute('nobody', pending.id, 'No reason'),
    ).rejects.toMatchObject({
      code: 'cooperative_not_found',
      kind: 'not_found',
    });
  });

  it('answers listing_not_found for a listing of a farmer outside the cooperative', async () => {
    const other = await listings.seed({ ...fields, farmerId: 'farmer-9' });
    await expect(
      reject.execute('coord-1', other.id, 'No reason'),
    ).rejects.toMatchObject({
      code: 'listing_not_found',
      kind: 'not_found',
    });
    expect((await listings.findById(other.id))?.status).toBe(
      'pending_approval',
    );
  });

  it('answers listing_not_found for an unknown id', async () => {
    await expect(
      reject.execute('coord-1', 'missing', 'No reason'),
    ).rejects.toMatchObject({ code: 'listing_not_found' });
  });

  it('answers listing_not_pending the second time, and for an already-verified listing', async () => {
    const pending = await listings.seed({ ...fields });
    const verified = await listings.seed({ ...fields, status: 'verified' });

    await reject.execute('coord-1', pending.id, 'First reason');

    await expect(
      reject.execute('coord-1', pending.id, 'Second reason'),
    ).rejects.toMatchObject({
      code: 'listing_not_pending',
      kind: 'conflict',
    });
    await expect(
      reject.execute('coord-1', verified.id, 'No reason'),
    ).rejects.toMatchObject({ code: 'listing_not_pending' });
    expect((await listings.findById(verified.id))?.status).toBe('verified');
  });

  it('does not remove the farmer from the cooperative', async () => {
    const pending = await listings.seed({ ...fields });
    const cooperative = (await cooperatives.findByCoordinatorId('coord-1'))[0];

    await reject.execute('coord-1', pending.id, 'No reason');

    const after = await cooperatives.findById(cooperative.id);
    expect(after?.memberFarmerIds).toContain('farmer-1');
  });
});
