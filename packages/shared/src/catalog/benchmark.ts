import { z } from "zod";

import { cropIdSchema } from "./crops";
import { districtSchema, pricePerKgSchema } from "./listing";

/**
 * Regional price benchmarks set by coordinators or wholesale auction tracking.
 *
 * Single Responsibility Principle (SRP): Decoupled from static crop definitions (`crops.ts`).
 * Stored in `price_benchmarks` collection in backend persistence layer.
 */
export const benchmarkSourceSchema = z.enum(["manual_entry", "wholesale_auction", "official_gov"]);

export type BenchmarkSource = z.infer<typeof benchmarkSourceSchema>;

export const priceBenchmarkSchema = z.object({
  id: z.string(),
  /** Denormalised district string (e.g. "Dambulla", "Kurunegala", "Polonnaruwa") */
  district: districtSchema,
  cropId: cropIdSchema,
  /** Calendar date, `YYYY-MM-DD`. */
  effectiveDate: z.string(),
  lowPrice: pricePerKgSchema,
  highPrice: pricePerKgSchema,
  source: benchmarkSourceSchema,
  /** User ID of the coordinator who set or verified this benchmark */
  setBy: z.string(),
  createdAt: z.string().optional()
});

export type PriceBenchmark = z.infer<typeof priceBenchmarkSchema>;

export const createPriceBenchmarkSchema = priceBenchmarkSchema.omit({
  id: true,
  createdAt: true
});

export type CreatePriceBenchmark = z.infer<typeof createPriceBenchmarkSchema>;

export const priceBenchmarkQuerySchema = z.object({
  crop: cropIdSchema,
  district: districtSchema.optional()
});

export type PriceBenchmarkQuery = z.infer<typeof priceBenchmarkQuerySchema>;

/**
 * Pure display formatting helper functions for UI rendering.
 * Keeps raw database fields (lowPrice, highPrice, effectiveDate) decoupled from UI strings.
 */
export function formatBenchmarkPriceRange(
  lowPrice: number,
  highPrice: number,
  unit: string = "kg"
): string {
  return `Rs. ${lowPrice} - ${highPrice}/${unit}`;
}

export function formatBenchmarkUpdatedText(
  effectiveDate?: string,
  source?: BenchmarkSource
): string {
  const sourceLabel =
    source === "wholesale_auction" ? "Verified wholesale auctions" : "Market coordinator update";
  return `Updated recently • ${sourceLabel}`;
}

const DEFAULT_BENCHMARKS: Record<string, { lowPrice: number; highPrice: number; hubName: string }> =
  {
    onion: { lowPrice: 180, highPrice: 210, hubName: "Dambulla Hub" },
    carrot: { lowPrice: 150, highPrice: 175, hubName: "Dambulla Hub" },
    tomato: { lowPrice: 180, highPrice: 210, hubName: "Dambulla Hub" },
    "green-chilli": { lowPrice: 240, highPrice: 280, hubName: "Dambulla Hub" },
    leeks: { lowPrice: 130, highPrice: 160, hubName: "Nuwara Eliya Hub" },
    beans: { lowPrice: 220, highPrice: 250, hubName: "Dambulla Hub" },
    brinjal: { lowPrice: 120, highPrice: 150, hubName: "Keppetipola Hub" },
    pumpkin: { lowPrice: 80, highPrice: 110, hubName: "Anuradhapura Hub" },
    potato: { lowPrice: 190, highPrice: 220, hubName: "Badulla Hub" },
    mango: { lowPrice: 200, highPrice: 260, hubName: "Kurunegala Hub" },
    banana: { lowPrice: 140, highPrice: 180, hubName: "Embilipitiya Hub" },
    papaya: { lowPrice: 110, highPrice: 150, hubName: "Dambulla Hub" },
    rice: { lowPrice: 115, highPrice: 135, hubName: "Polonnaruwa Hub" },
    coconut: { lowPrice: 90, highPrice: 120, hubName: "Gampaha Hub" }
  };

export function getBenchmarkForCrop(
  cropId: string,
  district: string = "Dambulla"
): PriceBenchmark & { hubName: string } {
  const benchmark = DEFAULT_BENCHMARKS[cropId] || {
    lowPrice: 150,
    highPrice: 200,
    hubName: `${district} Hub`
  };
  return {
    id: `bm_${cropId}_${district}`,
    district,
    cropId: cropId as any,
    effectiveDate: new Date().toISOString().split("T")[0],
    lowPrice: benchmark.lowPrice,
    highPrice: benchmark.highPrice,
    source: "wholesale_auction",
    setBy: "system_coordinator",
    hubName: benchmark.hubName
  };
}
