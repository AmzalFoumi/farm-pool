import { CROP_IDS } from '@farm-pool/shared';
import type { NewListing } from '../../../catalog/domain/entities/listing';
import { InMemoryListingRepository } from '../../../catalog/infrastructure/persistence/in-memory-listing.repository';
import { InMemoryBenchmarkPriceRepository } from '../../infrastructure/persistence/in-memory-benchmark-price.repository';
import { InMemoryCooperativeRepository } from '../../infrastructure/persistence/in-memory-cooperative.repository';
import {
  GetBenchmarkPriceHistory,
  HISTORY_LIMIT,
} from './get-benchmark-price-history';
import { GetBenchmarkPrices } from './get-benchmark-prices';
import { SetBenchmarkPrice } from './set-benchmark-price';

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

describe('SetBenchmarkPrice', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let benchmarkPrices: InMemoryBenchmarkPriceRepository;
  let setBenchmarkPrice: SetBenchmarkPrice;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    benchmarkPrices = new InMemoryBenchmarkPriceRepository();
    setBenchmarkPrice = new SetBenchmarkPrice(cooperatives, benchmarkPrices);
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: ['farmer-1'],
    });
  });

  it('publishes a price for the coordinator’s own district, always manual', async () => {
    const result = await setBenchmarkPrice.execute('coord-1', 'tomato', {
      lowPricePerKg: 150,
      highPricePerKg: 200,
    });

    expect(result).toMatchObject({
      cropId: 'tomato',
      district: 'Kurunegala',
      lowPricePerKg: 150,
      highPricePerKg: 200,
      source: 'manual',
      setByCoordinatorId: 'coord-1',
    });
    expect(typeof result.publishedAt).toBe('string');
  });

  it('publishing the same crop again adds a new row rather than replacing it', async () => {
    await setBenchmarkPrice.execute('coord-1', 'tomato', {
      lowPricePerKg: 150,
      highPricePerKg: 200,
    });
    await setBenchmarkPrice.execute('coord-1', 'tomato', {
      lowPricePerKg: 160,
      highPricePerKg: 210,
    });

    const history = await benchmarkPrices.findHistoryByCropAndDistrict(
      'tomato',
      'Kurunegala',
      10,
    );
    expect(history).toHaveLength(2);
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(
      setBenchmarkPrice.execute('nobody', 'tomato', {
        lowPricePerKg: 150,
        highPricePerKg: 200,
      }),
    ).rejects.toMatchObject({
      code: 'cooperative_not_found',
      kind: 'not_found',
    });
  });
});

describe('GetBenchmarkPrices', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let benchmarkPrices: InMemoryBenchmarkPriceRepository;
  let listings: InMemoryListingRepository;
  let getBenchmarkPrices: GetBenchmarkPrices;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    benchmarkPrices = new InMemoryBenchmarkPriceRepository();
    listings = new InMemoryListingRepository();
    getBenchmarkPrices = new GetBenchmarkPrices(
      cooperatives,
      benchmarkPrices,
      listings,
    );
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: ['farmer-1', 'farmer-2'],
    });
  });

  it('returns one entry per crop, null price and range where neither exists', async () => {
    const result = await getBenchmarkPrices.execute('coord-1');

    expect(result).toHaveLength(CROP_IDS.length);
    expect(result.find((r) => r.cropId === 'tomato')).toMatchObject({
      current: null,
      activeListingRange: null,
    });
  });

  it('fills in the current price once one has been set', async () => {
    await benchmarkPrices.seed({
      cropId: 'tomato',
      district: 'Kurunegala',
      lowPricePerKg: 150,
      highPricePerKg: 200,
      source: 'manual',
      setByCoordinatorId: 'coord-1',
    });

    const result = await getBenchmarkPrices.execute('coord-1');

    expect(result.find((r) => r.cropId === 'tomato')?.current).toMatchObject({
      lowPricePerKg: 150,
      highPricePerKg: 200,
    });
  });

  it('computes the active listing range from the cooperative’s own farmers only', async () => {
    await listings.seed({
      ...listingBase,
      farmerId: 'farmer-1',
      pricePerKg: 180,
    });
    await listings.seed({
      ...listingBase,
      farmerId: 'farmer-2',
      pricePerKg: 220,
    });
    await listings.seed({
      ...listingBase,
      farmerId: 'someone-else',
      pricePerKg: 999,
    });

    const result = await getBenchmarkPrices.execute('coord-1');

    expect(
      result.find((r) => r.cropId === 'tomato')?.activeListingRange,
    ).toEqual({
      lowPricePerKg: 180,
      highPricePerKg: 220,
      listingCount: 2,
    });
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(getBenchmarkPrices.execute('nobody')).rejects.toMatchObject({
      code: 'cooperative_not_found',
    });
  });
});

describe('GetBenchmarkPriceHistory', () => {
  let cooperatives: InMemoryCooperativeRepository;
  let benchmarkPrices: InMemoryBenchmarkPriceRepository;
  let getBenchmarkPriceHistory: GetBenchmarkPriceHistory;

  beforeEach(async () => {
    cooperatives = new InMemoryCooperativeRepository();
    benchmarkPrices = new InMemoryBenchmarkPriceRepository();
    getBenchmarkPriceHistory = new GetBenchmarkPriceHistory(
      cooperatives,
      benchmarkPrices,
    );
    await cooperatives.seed({
      coordinatorId: 'coord-1',
      name: 'Kurunegala Cooperative',
      district: 'Kurunegala',
      memberFarmerIds: [],
    });
  });

  const priceBase = {
    cropId: 'tomato' as const,
    district: 'Kurunegala',
    source: 'manual' as const,
    setByCoordinatorId: 'coord-1',
  };

  it('returns every price published for a crop, newest first', async () => {
    await benchmarkPrices.seed(
      { ...priceBase, lowPricePerKg: 140, highPricePerKg: 180 },
      new Date('2026-09-01'),
    );
    await benchmarkPrices.seed(
      { ...priceBase, lowPricePerKg: 150, highPricePerKg: 200 },
      new Date('2026-09-08'),
    );

    const history = await getBenchmarkPriceHistory.execute('coord-1', 'tomato');

    expect(history.map((h) => h.lowPricePerKg)).toEqual([150, 140]);
  });

  it('caps the result at HISTORY_LIMIT', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      await benchmarkPrices.seed({
        ...priceBase,
        lowPricePerKg: 150,
        highPricePerKg: 200,
      });
    }

    expect(
      await getBenchmarkPriceHistory.execute('coord-1', 'tomato'),
    ).toHaveLength(HISTORY_LIMIT);
  });

  it('throws cooperative_not_found for a coordinator with no cooperative', async () => {
    await expect(
      getBenchmarkPriceHistory.execute('nobody', 'tomato'),
    ).rejects.toMatchObject({ code: 'cooperative_not_found' });
  });
});
