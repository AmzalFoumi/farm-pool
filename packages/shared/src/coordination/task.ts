import { z } from "zod";

import { cropIdSchema } from "../catalog/crops";

/**
 * "Needs you today" (FARM-25) — real items a coordinator should look at, each a discriminated
 * union member so the app can render and route each kind differently. A third kind (benchmark
 * price not set) is drawn in Figma but has no collection behind it yet
 * (`.plans/coordination/OPEN.md` #3), so it is not a member here until it does.
 *
 * Both existing kinds are read-only: the api has no approve/verify endpoint yet
 * (`.plans/coordination/OPEN.md` #5), so the app shows these, it does not act on them.
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
  })
]);

export type CoordinatorTask = z.infer<typeof coordinatorTaskSchema>;

export const coordinatorTaskListSchema = z.array(coordinatorTaskSchema);
