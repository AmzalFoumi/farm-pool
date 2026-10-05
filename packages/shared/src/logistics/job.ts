import { z } from "zod";

import { cropIdSchema } from "../catalog/crops";
import {
  districtSchema,
  fulfillmentOptionSchema,
  kgSchema,
  pickupPointSchema,
  pricePerKgSchema
} from "../catalog/listing";
import { vehicleTypeSchema, driverVerificationSchema } from "../identity/driver";

/**
 * A delivery job, as a driver sees it (LP-20 … LP-24).
 *
 * A job is not a collection of its own. **A job IS an order that reached `open`** — LP-21 forbids
 * one existing without a confirmed order, and a separate `jobs` document would let the two drift
 * into disagreeing about whether the work exists. So the api assembles a job by reading the order
 * and the listing it was placed against; `id` here is the order's id, and accepting writes the
 * order's `assigned` state through the orders domain.
 *
 * The pickup fields live on the listing, not the order: a farmer's district, town and gate notes
 * describe the place, and the order only ever knew the deal.
 */

/** The board row. Enough to decide whether a job is worth taking, and nothing personal: the
 *  farmer's phone appears only once a driver has accepted (see `jobDetailSchema`). */
export const jobSummarySchema = z.object({
  /** The order's id. A job has no id of its own. */
  id: z.string(),
  listingId: z.string(),
  cropId: cropIdSchema,
  quantityKg: kgSchema,
  pricePerKg: pricePerKgSchema,
  total: z.number().nonnegative(),
  farmerName: z.string(),
  /** Where the produce is collected — the listing's district. */
  district: districtSchema,
  town: z.string().optional(),
  /**
   * The farm gate, when the farmer dropped a pin (FARM-26). Present on the board as well as the
   * detail: it carries no more privacy than the town already does, and a driver deciding whether
   * a trip is worth taking wants the real distance, not a district's.
   *
   * Absent on an older listing or one posted without a GPS fix — the app falls back to the
   * district centre, and says which it is showing.
   */
  pickupPoint: pickupPointSchema.optional(),
  /** `shared` is a consolidated batch candidate, `solo` a dedicated vehicle (LP-32). */
  fulfillmentOption: fulfillmentOptionSchema.optional(),
  /** `open` on the board; `assigned`, `in_transit` or `delivered` on a driver's own list. */
  status: z.enum(["open", "assigned", "in_transit", "delivered"]),
  createdAt: z.iso.datetime()
});

export type JobSummary = z.infer<typeof jobSummarySchema>;

export const jobListSchema = z.array(jobSummarySchema);

/**
 * Who to call at the farm gate. Present only on a job the caller has accepted — an open board
 * shows no phone numbers, so a driver cannot harvest contacts by scrolling.
 */
export const pickupContactSchema = z.object({
  farmerName: z.string(),
  /** E.164, as stored. A response never re-normalises; `phoneSchema` is for what a form sends. */
  farmerPhone: z.string(),
  district: districtSchema,
  town: z.string().optional(),
  address: z.string().optional(),
  /** "Gate is past the tank, call when you reach the junction" — the listing's farmgate notes. */
  farmgateNotes: z.string().optional()
});

export type PickupContact = z.infer<typeof pickupContactSchema>;

export const jobDetailSchema = jobSummarySchema.extend({
  note: z.string().optional(),
  /** Absent until this driver accepts the job. */
  pickup: pickupContactSchema.optional(),
  /** What was actually loaded at the gate. Absent until pickup is confirmed. */
  collectedKg: kgSchema.optional()
});

export type JobDetail = z.infer<typeof jobDetailSchema>;

/**
 * What the driver confirms at the farm gate (LP-50).
 *
 * `collectedKg` is asked for rather than assumed, because the load on the lorry regularly is not
 * the load on the order: a farmer harvests less than they listed, some of it is rejected at the
 * gate, a crate is damaged. The ordered quantity is the default the app pre-fills, not the value
 * the api records — a driver who taps straight through still records something true, and one who
 * edits it records what actually happened.
 *
 * Deliberately not capped at the ordered quantity: over-collection is real (a farmer sends the
 * extra 5 kg rather than keep it) and silently rejecting it would push the driver to lie.
 */
export const confirmPickupSchema = z.object({
  collectedKg: kgSchema
});

export type ConfirmPickupInput = z.input<typeof confirmPickupSchema>;
export type ConfirmPickupData = z.output<typeof confirmPickupSchema>;

/**
 * The driver, as the farmer and buyer see them (LP-04, LP-51).
 *
 * This is the requirement the whole verification feature exists for: a farmer checks the plate in
 * front of them against the plate on this screen before handing over produce. It is read fresh
 * from the account rather than snapshotted onto the order, so a driver whose verification changes
 * does not keep a stale badge on jobs they already hold.
 */
export const assignedDriverSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  phone: z.string(),
  vehicleType: vehicleTypeSchema,
  registration: z.string(),
  capacityKg: z.number().int().positive(),
  operatingDistrict: districtSchema,
  verification: driverVerificationSchema
});

export type AssignedDriver = z.infer<typeof assignedDriverSchema>;
