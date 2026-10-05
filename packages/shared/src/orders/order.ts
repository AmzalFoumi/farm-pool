import { z } from "zod";

import { cropIdSchema } from "../catalog/crops";
import { sriLankaPointSchema } from "../geo/point";
import { kgSchema, pricePerKgSchema } from "../catalog/listing";

/**
 * A buyer's purchase request against one listing (FARM-35).
 *
 * LIFECYCLE. The team's data model starts an order at `open`; the product doc says "buyer sends a
 * purchase request; farmer accepts or negotiates", so three states sit in front of it:
 *
 *   requested ──farmer──▶ accepted ──▶ open ──▶ assigned ──▶ in_transit ──▶ delivered
 *       │                     (from here on: the team's original enum, owned by later stories)
 *       ├──farmer──▶ declined
 *       └──buyer───▶ cancelled   (only while `requested`)
 *
 * This story writes `requested` and `cancelled`. Everything after is another developer's work and
 * is listed so the enum does not have to change under them.
 *
 * ONE LINE PER ORDER. Every workflow in the research is one crop, one listing, one order. If
 * multi-item orders are ever wanted, add `items[]` beside these fields; do not pre-build it.
 */
export const orderStatusSchema = z.enum([
  "requested",
  "accepted",
  "declined",
  "cancelled",
  "open",
  "assigned",
  "in_transit",
  "delivered"
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Statuses that still need something to happen. Drives the "active orders" idea on Home. */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "requested",
  "accepted",
  "open",
  "assigned",
  "in_transit"
];

/** What the buyer sends. Price and farmer come from the listing on the server, never the client. */
/**
 * Where a buyer wants the load delivered (FARM-26). The farm gate is on the listing; this is the
 * other end, and the pair is what makes a distance or a route possible at all.
 *
 * **Copied onto the order, never referenced.** A buyer may have saved this place on their
 * account, but renaming or deleting it later must not rewrite where a past delivery went — so the
 * label and the point are snapshotted here, exactly as a listing's price is snapshotted.
 *
 * Optional, like the farm gate: a buyer with no signal must still be able to place an order, and
 * a driver falls back to the district. An order without one is less useful, never broken.
 */
export const dropOffSchema = z.object({
  /** What the buyer calls the place, when it came from a saved one. */
  label: z.string().trim().max(60).optional(),
  point: sriLankaPointSchema
});

export type DropOff = z.infer<typeof dropOffSchema>;

export const placeOrderSchema = z.object({
  listingId: z.string().min(1),
  quantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional(),
  dropOff: dropOffSchema.optional()
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type PlaceOrderData = z.output<typeof placeOrderSchema>;

/**
 * A new price one side has put to the other before pickup (FARM-53). At most one is open on an
 * order at a time; the side that did not propose it accepts or declines, and either answer
 * removes it. Accepting rewrites `pricePerKg` and `total`.
 */
export const priceProposalSchema = z.object({
  proposedBy: z.enum(["buyer", "farmer"]),
  pricePerKg: pricePerKgSchema,
  reason: z.string().optional(),
  proposedAt: z.iso.datetime()
});

export type PriceProposal = z.infer<typeof priceProposalSchema>;

/** What either side sends to propose a new price. Who is proposing comes from the token. */
export const proposePriceSchema = z.object({
  pricePerKg: pricePerKgSchema,
  reason: z.string().trim().max(280, "Keep the reason under 280 characters").optional()
});

export type ProposePriceInput = z.input<typeof proposePriceSchema>;
export type ProposePriceData = z.output<typeof proposePriceSchema>;

/** A price can be renegotiated until the produce is on the vehicle. */
export const RENEGOTIABLE_ORDER_STATUSES: readonly OrderStatus[] = ["accepted", "open", "assigned"];

export const orderSchema = z.object({
  id: z.string(),
  buyerId: z.string(),
  farmerId: z.string(),
  farmerName: z.string(),
  listingId: z.string(),
  cropId: cropIdSchema,
  quantityKg: kgSchema,
  /** Snapshot of the listing price when the order was placed. */
  pricePerKg: pricePerKgSchema,
  total: z.number().nonnegative(),
  note: z.string().optional(),
  status: orderStatusSchema,
  /**
   * The driver who accepted this job, once one has (FARM-49/54). Written by the logistics domain
   * through `ORDER_REPOSITORY`, never by a client. Only the id is stored: the driver's name,
   * plate and verification are read fresh from the account, so a farmer at pickup is never shown
   * a badge that was true last week (`packages/shared/src/logistics/job.ts`).
   */
  assignedDriverId: z.string().optional(),
  /**
   * What the driver actually loaded at the farm gate (LP-50), which regularly differs from
   * `quantityKg` — a short harvest, produce rejected at the gate, a damaged crate. Recorded at
   * pickup and never overwritten afterwards. `quantityKg` stays the deal that was agreed; this is
   * what moved.
   */
  collectedKg: kgSchema.optional(),
  /** Where the buyer wants it delivered (FARM-26). Snapshotted at placement. */
  dropOff: dropOffSchema.optional(),
  /**
   * When the buyer confirmed the produce arrived (FARM-51). Deliberately a timestamp beside
   * `delivered` rather than a status after it: the driver's half of the lifecycle ends at
   * `delivered`, and whether the held money was released is the payment's to say.
   */
  receivedAt: z.iso.datetime().optional(),
  priceProposal: priceProposalSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export type Order = z.infer<typeof orderSchema>;

export const orderListSchema = z.array(orderSchema);
