import { z } from "zod";

import { cropIdSchema } from "../catalog/crops";

/**
 * "Needs you today" (FARM-25) — real items a coordinator should look at, each a discriminated
 * union member so the app can render and route each kind differently.
 *
 * `verify_farmer` and `approve_listing` are read-only: the api has no approve/verify endpoint yet
 * (`.plans/coordination/OPEN.md` #5), so the app shows these, it does not act on them.
 * `benchmark_missing` and `benchmark_stale` (FARM-37) are different — tapping either opens Set
 * Crop Price, a real write. Both only appear for a crop their own farmers are actively listing; a
 * crop nobody sells yet is not a task. `benchmark_missing` is a crop with no price at all;
 * `benchmark_stale` is a crop with one that has gone past `BENCHMARK_STALE_AFTER_DAYS` — the two
 * are kept apart so the app can tell "never set" from "set, but old".
 */
export const coordinatorTaskSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("verify_farmer"),
    farmerId: z.string(),
    farmerName: z.string()
  }),
  z.object({
    kind: z.literal("approve_listing"),
    listingId: z.string(),
    farmerName: z.string(),
    cropId: cropIdSchema,
    quantityKg: z.number()
  }),
  z.object({
    kind: z.literal("benchmark_missing"),
    cropId: cropIdSchema
  }),
  z.object({
    kind: z.literal("benchmark_stale"),
    cropId: cropIdSchema,
    publishedAt: z.iso.datetime()
  })
]);

export type CoordinatorTask = z.infer<typeof coordinatorTaskSchema>;

export const coordinatorTaskListSchema = z.array(coordinatorTaskSchema);
