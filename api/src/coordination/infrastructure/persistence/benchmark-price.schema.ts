import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import type { BenchmarkPriceSource, CropId } from '@farm-pool/shared';

/**
 * Storage shape of a benchmark price in the `benchmark_prices` collection. The domain works with
 * `BenchmarkPrice` from `domain/entities/benchmark-price.ts`; the repository maps between the two.
 *
 * Append-only: a coordinator setting a crop's price again inserts a new row rather than
 * overwriting the last one, so the price-change history is real rows, not a guess. "Current" is
 * whichever row for a `(cropId, district)` pair has the newest `publishedAt`.
 */
@Schema({
  collection: 'benchmark_prices',
  timestamps: { createdAt: false, updatedAt: false },
})
export class BenchmarkPriceDocument {
  @Prop({ required: true, index: true })
  cropId: CropId;

  @Prop({ required: true, trim: true, index: true })
  district: string;

  @Prop({ required: true })
  lowPricePerKg: number;

  @Prop({ required: true })
  highPricePerKg: number;

  @Prop({ required: true, enum: ['manual', 'regional_index'] })
  source: BenchmarkPriceSource;

  @Prop({ required: true })
  setByCoordinatorId: string;

  @Prop({ required: true })
  publishedAt: Date;
}

export type BenchmarkPriceHydrated = HydratedDocument<BenchmarkPriceDocument>;

export const BenchmarkPriceSchema = SchemaFactory.createForClass(
  BenchmarkPriceDocument,
);
BenchmarkPriceSchema.index({ cropId: 1, district: 1, publishedAt: -1 });

export const BENCHMARK_PRICE_MODEL = BenchmarkPriceDocument.name;
