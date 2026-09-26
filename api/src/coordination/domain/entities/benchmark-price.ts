import type {
  BenchmarkPrice as BenchmarkPriceDto,
  BenchmarkPriceSource,
  CropId,
} from '@farm-pool/shared';

/**
 * A coordinator's price guidance for one crop in their district (FARM-37). One row per
 * `(cropId, district)` pair — a re-set replaces it, `publishedAt` is the only history kept. See
 * `benchmark-price.ts` in `packages/shared` for why `source` is always `'manual'` today.
 */
export interface BenchmarkPrice {
  id: string;
  cropId: CropId;
  district: string;
  lowPricePerKg: number;
  highPricePerKg: number;
  source: BenchmarkPriceSource;
  setByCoordinatorId: string;
  publishedAt: Date;
}

/** What is needed to set one. The store assigns `id`; `publishedAt` is set to now. */
export type NewBenchmarkPrice = Omit<BenchmarkPrice, 'id' | 'publishedAt'>;

export function toBenchmarkPriceDto(price: BenchmarkPrice): BenchmarkPriceDto {
  return {
    id: price.id,
    cropId: price.cropId,
    district: price.district,
    lowPricePerKg: price.lowPricePerKg,
    highPricePerKg: price.highPricePerKg,
    source: price.source,
    setByCoordinatorId: price.setByCoordinatorId,
    publishedAt: price.publishedAt.toISOString(),
  };
}
