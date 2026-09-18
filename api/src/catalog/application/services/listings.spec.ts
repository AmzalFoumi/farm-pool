import type { NewListing } from '../../domain/entities/listing';
import { InMemoryListingRepository } from '../../infrastructure/persistence/in-memory-listing.repository';
import { GetListing } from './get-listing';
import { BROWSE_LIMIT, ListListings } from './list-listings';

const base: NewListing = {
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

describe('ListListings', () => {
  let repo: InMemoryListingRepository;
  let list: ListListings;

  beforeEach(() => {
    repo = new InMemoryListingRepository();
    list = new ListListings(repo);
  });

  it('returns only verified listings, newest first', async () => {
    await repo.seed({ ...base }, new Date('2026-09-01'));
    await repo.seed({ ...base, cropId: 'mango' }, new Date('2026-09-03'));
    await repo.seed({ ...base, status: 'draft' }, new Date('2026-09-05'));
    await repo.seed(
      { ...base, status: 'pending_approval' },
      new Date('2026-09-06'),
    );

    const result = await list.execute({});

    expect(result.map((l) => l.cropId)).toEqual(['mango', 'tomato']);
    expect(result[0]).toMatchObject({
      farmerName: 'Nimal',
      district: 'Kurunegala',
      harvestDate: '2026-09-20',
    });
    expect(typeof result[0].createdAt).toBe('string');
  });

  it('filters by crop and by district, case-insensitively', async () => {
    await repo.seed({ ...base });
    await repo.seed({ ...base, cropId: 'carrot', district: 'Matale' });

    expect(await list.execute({ crop: 'carrot' })).toHaveLength(1);
    expect(await list.execute({ district: 'matale' })).toHaveLength(1);
    expect(await list.execute({ crop: 'tomato', district: 'Matale' })).toEqual(
      [],
    );
  });

  it('caps the result at the browse limit', async () => {
    for (let i = 0; i < BROWSE_LIMIT + 5; i++) await repo.seed({ ...base });
    expect(await list.execute({})).toHaveLength(BROWSE_LIMIT);
  });
});

describe('GetListing', () => {
  it('returns a verified listing by id', async () => {
    const repo = new InMemoryListingRepository();
    const created = await repo.seed({ ...base });

    const result = await new GetListing(repo).execute(created.id);

    expect(result.id).toBe(created.id);
    expect(result.status).toBe('verified');
  });

  it('treats an unknown id and a non-verified listing alike: listing_not_found', async () => {
    const repo = new InMemoryListingRepository();
    const draft = await repo.seed({ ...base, status: 'draft' });
    const get = new GetListing(repo);

    await expect(get.execute('nope')).rejects.toMatchObject({
      code: 'listing_not_found',
      kind: 'not_found',
    });
    await expect(get.execute(draft.id)).rejects.toMatchObject({
      code: 'listing_not_found',
    });
  });
});
