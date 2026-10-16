import { z } from "zod";

import { accountStatusSchema } from "../identity/role";

/**
 * A cooperative member, as the coordinator's Farmers list (and the farmer detail screen it opens
 * into, FARM-44) sees it. `district` is the one the farmer named applying to the cooperative when
 * present; a member seeded before that existed falls back to their most recent listing's
 * district, same as before FARM-44.
 */
export const cooperativeFarmerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  /** Needed for the coordinator to actually verify who they are approving (FARM-44) — visible
   *  only within their own cooperative, same scope as everything else on this list. */
  phone: z.string(),
  status: accountStatusSchema,
  district: z.string().optional(),
  listingCount: z.number().int().min(0),
  createdAt: z.iso.datetime()
});

export type CooperativeFarmer = z.infer<typeof cooperativeFarmerSchema>;

export const cooperativeFarmerListSchema = z.array(cooperativeFarmerSchema);

/** Body for `PUT /coordination/farmers/:farmerId/reject` (FARM-44) — a reason is mandatory,
 *  shown back to the farmer on their own account-status screen. */
export const rejectFarmerSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason for rejecting")
    .max(500, "Keep it under 500 characters")
});

export type RejectFarmerInput = z.infer<typeof rejectFarmerSchema>;
