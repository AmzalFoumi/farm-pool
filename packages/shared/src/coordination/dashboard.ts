import { z } from "zod";

import { cooperativeSchema } from "./cooperative";

/**
 * What a coordinator sees for their cooperative (FARM-25): the group itself, how many farmers
 * are in it, and how much they have listed. The per-listing detail lives on a farmer's own
 * detail screen (not built yet), not duplicated here — a dashboard is counts and what needs
 * attention, not a data dump. See `coordinatorTaskSchema` for the latter.
 */
export const coordinatorDashboardSchema = z.object({
  cooperative: cooperativeSchema,
  farmerCount: z.number().int().min(0),
  listingCount: z.number().int().min(0)
});

export type CoordinatorDashboard = z.infer<typeof coordinatorDashboardSchema>;
