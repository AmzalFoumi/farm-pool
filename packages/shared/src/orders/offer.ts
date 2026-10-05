import { z } from "zod";
import { cropIdSchema } from "../catalog/crops";
import { kgSchema, pricePerKgSchema } from "../catalog/listing";

/**
 * The negotiation phase that precedes an Order (FARM-46).
 *
 * Two listing types can start a negotiation: a buyer countering a farmer's STANDARD listing, or a
 * farmer countering a buyer's WANTED listing. Both produce the same shape — only `initiatedBy`
 * and which side of (buyerId, farmerId) came from the listing vs. the requester differs.
 *
 * LIFECYCLE. Unlike Order, this is not linear — either side can counter repeatedly:
 *
 *   PENDING ──counter──▶ NEGOTIATING ──counter (loops)──▶ NEGOTIATING
 *      │                       │
 *      ├──────accept───────────┴──▶ ACCEPTED  (an Order is created; see orders/order.ts)
 *      └──────decline──────────────▶ DECLINED
 *
 * Mutation rule: every counter overwrites the root pricePerKg/quantityKg/note (the "current ask")
 * and appends to `negotiationHistory` (the append-only log). Never delete history entries.
 */
export const offerStatusSchema = z.enum([
  "PENDING",
  "NEGOTIATING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED"
]);
export type OfferStatus = z.infer<typeof offerStatusSchema>;

export const listingTypeSchema = z.enum(["STANDARD", "WANTED"]);
export type ListingType = z.infer<typeof listingTypeSchema>;

export const senderTypeSchema = z.enum(["FARMER", "BUYER"]);
export type SenderType = z.infer<typeof senderTypeSchema>;

export const negotiationEntrySchema = z.object({
  senderType: senderTypeSchema,
  proposedPrice: pricePerKgSchema,
  proposedQuantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional(),
  timestamp: z.iso.datetime()
});
export type NegotiationEntry = z.infer<typeof negotiationEntrySchema>;

/** What either party sends to counter. Validated identically on mobile forms and the api. */
export const submitNegotiationSchema = z.object({
  senderType: senderTypeSchema,
  proposedPrice: pricePerKgSchema,
  proposedQuantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional()
});
export type SubmitNegotiationInput = z.input<typeof submitNegotiationSchema>;
export type SubmitNegotiationData = z.output<typeof submitNegotiationSchema>;

/** What starts a negotiation — a buyer requesting a STANDARD listing, or a farmer offering on a WANTED one. */
export const createOfferSchema = z.object({
  listingId: z.string().min(1),
  listingType: listingTypeSchema,
  proposedPrice: pricePerKgSchema,
  proposedQuantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional()
});
export type CreateOfferInput = z.input<typeof createOfferSchema>;
export type CreateOfferData = z.output<typeof createOfferSchema>;

export const offerSchema = z.object({
  id: z.string(),
  buyerId: z.string(),
  farmerId: z.string(),
  listingId: z.string(),
  listingType: listingTypeSchema,
  cropId: cropIdSchema,
  initiatedBy: senderTypeSchema,

  pricePerKg: pricePerKgSchema,
  quantityKg: kgSchema,
  total: z.number().nonnegative(),
  note: z.string().optional(),

  status: offerStatusSchema,
  actionRequiredBy: senderTypeSchema,
  negotiationHistory: z.array(negotiationEntrySchema),

  /** Set once this offer is accepted and an Order is created from it. */
  orderId: z.string().optional(),

  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});
export type Offer = z.infer<typeof offerSchema>;

export const offerListSchema = z.array(offerSchema);
