import { z } from "zod";
import { cropIdSchema } from "../catalog/crops";
import { kgSchema, pricePerKgSchema } from "../catalog/listing";
import { dropOffSchema } from "./order";

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
  /** Ignored by the api, which reads the side from the token. Optional so old clients still pass. */
  senderType: senderTypeSchema.optional(),
  proposedPrice: pricePerKgSchema,
  proposedQuantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional(),
  /** Where the buyer wants it delivered. Only the buyer's side is stored. */
  dropOff: dropOffSchema.optional()
});
export type SubmitNegotiationInput = z.input<typeof submitNegotiationSchema>;
export type SubmitNegotiationData = z.output<typeof submitNegotiationSchema>;

/** What starts a negotiation — a buyer requesting a STANDARD listing, or a farmer offering on a WANTED one. */
export const createOfferSchema = z.object({
  listingId: z.string().min(1),
  listingType: listingTypeSchema,
  proposedPrice: pricePerKgSchema,
  proposedQuantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional(),
  /** Where the buyer wants it delivered (FARM-26). Copied onto the order when the offer is accepted. */
  dropOff: dropOffSchema.optional()
});
export type CreateOfferInput = z.input<typeof createOfferSchema>;
export type CreateOfferData = z.output<typeof createOfferSchema>;

/** The optional body of an accept. `.default({})` because the app used to send no body at all. */
export const acceptOfferSchema = z.object({ dropOff: dropOffSchema.optional() }).default({});
export type AcceptOfferInput = z.input<typeof acceptOfferSchema>;
export type AcceptOfferData = z.output<typeof acceptOfferSchema>;

export const acceptOfferResultSchema = z.object({ orderId: z.string() });
export type AcceptOfferResult = z.infer<typeof acceptOfferResultSchema>;

export const offerSchema = z.object({
  id: z.string(),
  buyerId: z.string(),
  farmerId: z.string(),
  listingId: z.string(),
  listingType: listingTypeSchema,
  cropId: cropIdSchema,
  initiatedBy: senderTypeSchema,
  /** Snapshots taken when the offer was created. Absent on offers stored before they existed. */
  farmerName: z.string().optional(),
  buyerName: z.string().optional(),

  pricePerKg: pricePerKgSchema,
  quantityKg: kgSchema,
  total: z.number().nonnegative(),
  note: z.string().optional(),
  /** Where the buyer wants it delivered. Copied onto the order at acceptance. */
  dropOff: dropOffSchema.optional(),

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
