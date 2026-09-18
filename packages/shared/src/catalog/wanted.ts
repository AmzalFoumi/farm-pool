import { z } from "zod";

import { cropIdSchema } from "./crops";
import { districtSchema, kgSchema, pricePerKgSchema } from "./listing";

/**
 * A buyer's crop request — the "reverse listing" from `.plans/PRODUCT.md` (FARM-36).
 *
 * The buyer says what they want; farmers answer later (a separate story, which will add a
 * `responses` concept beside this rather than inside it). `open` → `closed` is the whole lifecycle
 * for now; `expired` can be added when a job runs over `neededBy`.
 */
export const wantedStatusSchema = z.enum(["open", "closed"]);

export type WantedStatus = z.infer<typeof wantedStatusSchema>;

export const createWantedSchema = z.object({
  cropId: cropIdSchema,
  quantityKg: kgSchema,
  maxPricePerKg: pricePerKgSchema.optional(),
  /** Calendar date, `YYYY-MM-DD`. */
  neededBy: z.iso.date("Use the form YYYY-MM-DD"),
  district: districtSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional()
});

/** What the form holds. */
export type CreateWantedInput = z.input<typeof createWantedSchema>;
/** What the api receives. */
export type CreateWantedData = z.output<typeof createWantedSchema>;

export const wantedListingSchema = createWantedSchema.extend({
  id: z.string(),
  buyerId: z.string(),
  status: wantedStatusSchema,
  createdAt: z.iso.datetime()
});

export type WantedListing = z.infer<typeof wantedListingSchema>;

export const wantedListSchema = z.array(wantedListingSchema);
