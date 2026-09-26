import {
  CROP_IDS,
  type CropId,
  type CropPriceContext,
} from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import { toBenchmarkPriceDto } from '../../domain/entities/benchmark-price';
import type { BenchmarkPriceRepository } from '../../domain/repositories/benchmark-price.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

const LISTING_SAMPLE_LIMIT = 1000;

interface ListingRange {
  lowPricePerKg: number;
  highPricePerKg: number;
  listingCount: number;
}

/**
 * Every crop's price picture for the coordinator's district (FARM-37): the current benchmark, if
 * one has been set, and what their own farmers are actively asking for it right now. Both are
 * real reads — this is the "Daily Benchmark" list, and the reference a coordinator sees before
 * setting a price, not a guess the app makes up.
 */
export class GetBenchmarkPrices {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly benchmarkPrices: BenchmarkPriceRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(coordinatorId: string): Promise<CropPriceContext[]> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const [prices, memberListings] = await Promise.all([
      this.benchmarkPrices.findCurrentByDistrict(cooperative.district),
      this.listings.findVerified(
        { farmerIds: cooperative.memberFarmerIds },
        LISTING_SAMPLE_LIMIT,
      ),
    ]);

    const priceByCrop = new Map(prices.map((price) => [price.cropId, price]));
    const rangeByCrop = new Map<CropId, ListingRange>();
    for (const listing of memberListings) {
      const range = rangeByCrop.get(listing.cropId);
      if (!range) {
        rangeByCrop.set(listing.cropId, {
          lowPricePerKg: listing.pricePerKg,
          highPricePerKg: listing.pricePerKg,
          listingCount: 1,
        });
        continue;
      }
      range.lowPricePerKg = Math.min(range.lowPricePerKg, listing.pricePerKg);
      range.highPricePerKg = Math.max(range.highPricePerKg, listing.pricePerKg);
      range.listingCount += 1;
    }

    return CROP_IDS.map((cropId) => {
      const current = priceByCrop.get(cropId);
      return {
        cropId,
        current: current ? toBenchmarkPriceDto(current) : null,
        activeListingRange: rangeByCrop.get(cropId) ?? null,
      };
    });
  }
}
