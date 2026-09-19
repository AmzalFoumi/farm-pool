import { z } from "zod";

import { cropIdSchema } from "./crops";

/**
 * A farmer's produce listing as the buyer sees it (FARM-21 / FARM-22).
 *
 * Deliberately small. Photos, quality grade, expiry and pickup coordinates are added when farmer
 * listing creation defines them — each is one optional field here and one `@Prop` in the api.
 * `farmerName` is copied onto the listing so the browse screen needs no second request.
 */

/** Matches the team's shared data model. Buyers only ever receive `verified`. */
export const listingStatusSchema = z.enum([
  "draft",
  "pending_approval",
  "verified",
  "rejected",
  "sold"
]);

export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const districtSchema = z
  .string()
  .trim()
  .min(2, "Enter a district")
  .max(40, "That district name is too long");

export const kgSchema = z.number().int("Whole kilograms only").positive("Must be more than 0 kg");

export const pricePerKgSchema = z.number().positive("Must be more than Rs 0");

export const listingSchema = z.object({
  id: z.string(),
  farmerId: z.string(),
  farmerName: z.string(),
  cropId: cropIdSchema,
  category: z.string().optional(),
  quantityKg: kgSchema,
  unit: z.string().optional(),
  variety: z.string().optional(),
  grade: z.string().optional(),
  packaging: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  pricePerKg: pricePerKgSchema,
  /** Calendar date, `YYYY-MM-DD`. */
  harvestDate: z.string(),
  expiryDays: z.number().optional(),
  photos: z.array(z.string()).optional(),
  acceptNegotiation: z.boolean().optional(),
  district: districtSchema,
  town: z.string().optional(),
  address: z.string().optional(),
  fulfillmentOption: z.string().optional(),
  farmgateNotes: z.string().optional(),
  /** The smallest quantity a buyer may order. Set by the farmer or the seed, never by the buyer. */
  minOrderKg: kgSchema,
  status: listingStatusSchema,
  createdAt: z.iso.datetime()
});

export type Listing = z.infer<typeof listingSchema>;

export const listingListSchema = z.array(listingSchema);

/** Query string for `GET /catalog/listings`. All optional; omitted means "all". */
export const listingQuerySchema = z.object({
  crop: cropIdSchema.optional(),
  district: districtSchema.optional(),
  farmerId: z.string().optional()
});

export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const createListingSchema = z.object({
  cropId: cropIdSchema,
  category: z.string().optional(),
  quantityKg: kgSchema,
  unit: z.string().optional(),
  variety: z.string().optional(),
  grade: z.string().optional(),
  packaging: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  pricePerKg: pricePerKgSchema,
  harvestDate: z.string().min(1, "Harvest date is required"),
  expiryDays: z.number().optional(),
  photos: z.array(z.string()).optional(),
  acceptNegotiation: z.boolean().optional(),
  district: districtSchema,
  town: z.string().optional(),
  address: z.string().optional(),
  fulfillmentOption: z.string().optional(),
  farmgateNotes: z.string().optional(),
  minOrderKg: kgSchema.optional()
});

export type CreateListingInput = z.input<typeof createListingSchema>;
export type CreateListingData = z.output<typeof createListingSchema>;
