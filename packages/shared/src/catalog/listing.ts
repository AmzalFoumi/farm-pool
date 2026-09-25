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
  quantityKg: kgSchema,
  unit: z.string().optional(),
  variety: z.string().optional(),
  grade: z.string().optional(),
  packaging: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  pricePerKg: pricePerKgSchema,
  /** Calendar date, `YYYY-MM-DD`. */
  harvestDate: z.iso.date(),
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

/** Query string for `GET /catalog/listings`. Both optional; omitted means "all". */
export const listingQuerySchema = z.object({
  crop: cropIdSchema.optional(),
  district: districtSchema.optional()
});

export type ListingQuery = z.infer<typeof listingQuerySchema>;

/** Free text a farmer types. Capped so one field cannot carry a page of text into every order. */
const shortText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

export const createListingSchema = z
  .object({
    cropId: cropIdSchema,
    quantityKg: kgSchema,
    unit: z.string().optional(),
    variety: shortText(60).optional(),
    grade: z.string().optional(),
    packaging: z.string().optional(),
    certifications: z.array(shortText(60)).max(10).optional(),
    pricePerKg: pricePerKgSchema,
    /** Calendar date, `YYYY-MM-DD`. The app turns "Today" / "In a week" into a date before sending. */
    harvestDate: z.iso.date("Enter the harvest date as YYYY-MM-DD"),
    /** How many days the listing stays open. */
    expiryDays: z
      .number()
      .int("Whole days only")
      .positive("Must be at least 1 day")
      .max(90)
      .optional(),
    photos: z.array(z.string()).optional(),
    acceptNegotiation: z.boolean().optional(),
    district: districtSchema,
    town: shortText(60).optional(),
    address: shortText(200).optional(),
    fulfillmentOption: z.string().optional(),
    farmgateNotes: shortText(500).optional(),
    minOrderKg: kgSchema.optional()
  })
  /* A minimum order above the whole quantity makes the listing impossible to order. */
  .refine((l) => l.minOrderKg === undefined || l.minOrderKg <= l.quantityKg, {
    path: ["minOrderKg"],
    message: "The minimum order cannot be more than the quantity on offer"
  });

export type CreateListingInput = z.input<typeof createListingSchema>;
export type CreateListingData = z.output<typeof createListingSchema>;
