import { z } from "zod";

import { cropIdSchema } from "../catalog/crops";
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
export const placeOrderSchema = z.object({
  listingId: z.string().min(1),
  quantityKg: kgSchema,
  note: z.string().trim().max(280, "Keep the note under 280 characters").optional()
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type PlaceOrderData = z.output<typeof placeOrderSchema>;

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
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export type Order = z.infer<typeof orderSchema>;

export const orderListSchema = z.array(orderSchema);
