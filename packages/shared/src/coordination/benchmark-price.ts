import { z } from "zod";

import { cropIdSchema } from "../catalog/crops";
import { districtSchema, pricePerKgSchema } from "../catalog/listing";

/**
 * A coordinator's daily price guidance for one crop in their district (FARM-37). The coordinator
 * — an agricultural officer in the product's persona — sets this from what they already know of
 * the market; the app has no live feed behind it, so `source` is always `"manual"` today.
 * `"regional_index"` is reserved for a future external feed and unused until one exists
 * (`.plans/coordination/OPEN.md` #3).
 *
 * One record per crop per district, replaced (not versioned) each time a coordinator updates it —
 * `publishedAt` is the only history kept.
 */
export const benchmarkPriceSourceSchema = z.enum(["manual", "regional_index"]);

export type BenchmarkPriceSource = z.infer<typeof benchmarkPriceSourceSchema>;

export const benchmarkPriceSchema = z.object({
  id: z.string(),
  cropId: cropIdSchema,
  district: districtSchema,
  lowPricePerKg: pricePerKgSchema,
  highPricePerKg: pricePerKgSchema,
  source: benchmarkPriceSourceSchema,
  setByCoordinatorId: z.string(),
  publishedAt: z.iso.datetime()
});

export type BenchmarkPrice = z.infer<typeof benchmarkPriceSchema>;

export const benchmarkPriceListSchema = z.array(benchmarkPriceSchema);

/** Body for `PUT /coordination/benchmarks/:cropId` — the coordinator's own district is implied by
 *  their cooperative, so it is never a field the client sends. */
export const setBenchmarkPriceSchema = z
  .object({
    lowPricePerKg: pricePerKgSchema,
    highPricePerKg: pricePerKgSchema
  })
  .refine((body) => body.lowPricePerKg <= body.highPricePerKg, {
    message: "Low price must not be more than the high price",
    path: ["highPricePerKg"]
  });

export type SetBenchmarkPrice = z.infer<typeof setBenchmarkPriceSchema>;

/**
 * What a coordinator sees for one crop before they set its price: the current benchmark (if any)
 * and what their own farmers are actively asking for it right now. Both are real reads, not
 * invented numbers — the app's part is showing what it already has, not guessing a market price.
 */
export const cropPriceContextSchema = z.object({
  cropId: cropIdSchema,
  current: benchmarkPriceSchema.nullable(),
  activeListingRange: z
    .object({
      lowPricePerKg: pricePerKgSchema,
      highPricePerKg: pricePerKgSchema,
      listingCount: z.number().int().positive()
    })
    .nullable()
});

export type CropPriceContext = z.infer<typeof cropPriceContextSchema>;

export const cropPriceContextListSchema = z.array(cropPriceContextSchema);

/** A price is expected to be refreshed weekly — a coordinator publishing it older than this is a
 *  "Set" price gone stale, not a missing one. One place so the api's task feed and the app's
 *  filter cannot disagree on what "stale" means. */
export const BENCHMARK_STALE_AFTER_DAYS = 7;

export function isBenchmarkPriceStale(publishedAt: string, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - new Date(publishedAt).getTime();
  return ageMs > BENCHMARK_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}
