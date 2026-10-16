import { z } from "zod";

/** Body for `PUT /coordination/listings/:listingId/reject` (FARM-43) — a reason is mandatory,
 *  shown back to the farmer on their own listings screen. Mirrors `rejectFarmerSchema`. */
export const rejectListingSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Give a reason for rejecting")
    .max(500, "Keep it under 500 characters")
});

export type RejectListingInput = z.infer<typeof rejectListingSchema>;
