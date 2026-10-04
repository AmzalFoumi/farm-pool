import { z } from "zod";

/**
 * Escrow for one order (FARM-41, FARM-51, FARM-48).
 *
 * The buyer pays the whole total once, after the farmer has accepted. Part of it — the advance —
 * goes to the farmer straight away; the rest is held until the buyer confirms the produce arrived.
 *
 *   order `accepted` ──buyer pays──▶ payment `in_escrow`  (order becomes `open`)
 *   order `delivered` ──buyer confirms receipt──▶ payment `released`
 *
 * NO REAL MONEY MOVES. The api records who paid what and who was paid, behind a `PaymentGateway`
 * port whose only implementation approves everything (`.plans/DECISIONS.md`, "Payments").
 *
 * ONE PAYMENT PER ORDER. Every movement of money is an entry on it, so a receipt is the entries
 * read back in order rather than a second stored document that could disagree with them.
 */

/** The share of the total released to the farmer the moment the buyer pays. */
export const ADVANCE_RATE = 0.3;

const toCents = (rupees: number) => Math.round(rupees * 100) / 100;

/**
 * Split a total into the advance and the part that stays held. The held part is the remainder,
 * not a second multiplication, so the two always add back up to the total.
 */
export function splitTotal(total: number): { advanceAmount: number; heldAmount: number } {
  const advanceAmount = Math.round(total * ADVANCE_RATE);
  return { advanceAmount, heldAmount: toCents(total - advanceAmount) };
}

export const paymentStatusSchema = z.enum(["in_escrow", "released"]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/**
 * One movement of money. `deposit` and `top_up` come from the buyer; `advance_release` and
 * `balance_release` go to the farmer; `refund` goes back to the buyer. `top_up` and `refund`
 * exist only for a price renegotiated after the money was already held (FARM-53).
 */
export const paymentEntryKindSchema = z.enum([
  "deposit",
  "advance_release",
  "balance_release",
  "top_up",
  "refund"
]);

export type PaymentEntryKind = z.infer<typeof paymentEntryKindSchema>;

export const paymentEntrySchema = z.object({
  kind: paymentEntryKindSchema,
  amount: z.number().nonnegative(),
  /** Quotable in a dispute: both sides read the same number off their own phone. */
  receiptNo: z.string(),
  at: z.iso.datetime()
});

export type PaymentEntry = z.infer<typeof paymentEntrySchema>;

export const paymentMethodSchema = z.enum(["simulated"]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const paymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  buyerId: z.string(),
  farmerId: z.string(),
  /** What the deal is worth now. Follows the order's total if the price is renegotiated. */
  total: z.number().nonnegative(),
  /** Already released to the farmer when the buyer paid. Never changes afterwards. */
  advanceAmount: z.number().nonnegative(),
  /** Still held. Becomes 0 when the buyer confirms receipt. */
  heldAmount: z.number().nonnegative(),
  status: paymentStatusSchema,
  method: paymentMethodSchema,
  entries: z.array(paymentEntrySchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export type Payment = z.infer<typeof paymentSchema>;
