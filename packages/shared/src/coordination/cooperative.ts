import { z } from "zod";

import { districtSchema } from "../catalog/listing";

/**
 * A coordinator's farmer group (FARM-25). Membership is kept as an array on the cooperative side,
 * not a field on the farmer — see `.plans/coordination/OPEN.md` #1 for why.
 */

export const cooperativeSchema = z.object({
  id: z.string(),
  coordinatorId: z.string(),
  name: z.string().trim().min(2, "Enter a name").max(80, "That name is too long"),
  district: districtSchema,
  memberFarmerIds: z.array(z.string()),
  createdAt: z.iso.datetime()
});

export type Cooperative = z.infer<typeof cooperativeSchema>;

export const cooperativeListSchema = z.array(cooperativeSchema);

/** Body for `POST /coordination/apply` (FARM-44) — a farmer naming the district they farm in,
 *  right after registering, so they land in the cooperative that covers it. */
export const joinCooperativeSchema = z.object({
  district: districtSchema
});

export type JoinCooperativeInput = z.infer<typeof joinCooperativeSchema>;
