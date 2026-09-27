import type { CropId } from '@farm-pool/shared';
import type {
  BenchmarkPrice,
  NewBenchmarkPrice,
} from '../entities/benchmark-price';

/**
 * "Something that can store benchmark prices." Use-cases see only this; the Mongoose
 * implementation is in `infrastructure/persistence/` and an in-memory one backs the unit tests.
 *
 * `create` never overwrites: every publish is a new row, so a crop's price-change graph has real
 * data behind it. "Current" is derived, not stored — the most recently published row for a
 * `(cropId, district)` pair.
 */
export interface BenchmarkPriceRepository {
  /** The current (most recently published) price for every crop this district has one for. */
  findCurrentByDistrict(district: string): Promise<BenchmarkPrice[]>;
  findCurrentByCropAndDistrict(
    cropId: CropId,
    district: string,
  ): Promise<BenchmarkPrice | null>;
  /** Every price ever published for this crop in this district, newest first, at most `limit`. */
  findHistoryByCropAndDistrict(
    cropId: CropId,
    district: string,
    limit: number,
  ): Promise<BenchmarkPrice[]>;
  create(price: NewBenchmarkPrice): Promise<BenchmarkPrice>;
}

export const BENCHMARK_PRICE_REPOSITORY = Symbol('BenchmarkPriceRepository');
