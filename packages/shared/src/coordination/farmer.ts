import { z } from "zod";

import { accountStatusSchema } from "../identity/role";

/**
 * A cooperative member, as the coordinator's Farmers list sees it (FARM-25). `district` is
 * derived from the farmer's most recent listing, since `User` carries no location of its own — a
 * brand-new member with no listings has none.
 */
export const cooperativeFarmerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: accountStatusSchema,
  district: z.string().optional(),
  listingCount: z.number().int().min(0)
});

export type CooperativeFarmer = z.infer<typeof cooperativeFarmerSchema>;

export const cooperativeFarmerListSchema = z.array(cooperativeFarmerSchema);
