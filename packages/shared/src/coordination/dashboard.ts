import { z } from "zod";

import { listingSchema } from "../catalog/listing";
import { cooperativeSchema } from "./cooperative";

/**
 * What a coordinator sees for their cooperative (FARM-25): the group itself, how many farmers
 * are in it, and their verified listings. Counts (to-approve, disputes) are not here yet — those
 * depend on features not built (`.plans/coordination/OPEN.md`).
 */
export const coordinatorDashboardSchema = z.object({
  cooperative: cooperativeSchema,
  farmerCount: z.number().int().min(0),
  listings: z.array(listingSchema)
});

export type CoordinatorDashboard = z.infer<typeof coordinatorDashboardSchema>;
