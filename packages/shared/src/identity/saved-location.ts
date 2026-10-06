import { z } from "zod";

import { sriLankaPointSchema } from "../geo/point";

/**
 * A place a buyer delivers to often, kept on their account so they pick it instead of pinning it
 * again (FARM-26).
 *
 * WHY ON THE ACCOUNT AND THE ORDER BOTH: the saved list is a convenience, the order's `dropOff`
 * is the fact. A buyer who later renames or deletes "Dambulla market" must not silently rewrite
 * where last month's delivery actually went, so placing an order **copies** the point onto the
 * order rather than referencing the saved entry. Same reasoning as a listing's price snapshot.
 *
 * `label` is what the buyer calls it, in their own words and their own script — "Dambulla
 * economic centre", "ගබඩාව". It is never matched on, only shown.
 */
export const savedLocationSchema = z.object({
  /** Stable id so the app can key a list and delete one. Assigned by the api. */
  id: z.string(),
  label: z.string(),
  point: sriLankaPointSchema
});

export type SavedLocation = z.infer<typeof savedLocationSchema>;

/** Free text a buyer types for a place. Capped so one label cannot carry a paragraph. */
const labelSchema = z
  .string()
  .trim()
  .min(1, "Give this place a name")
  .max(60, "Keep the name under 60 characters");

/** What the buyer sends to save a place. The id is the api's to assign. */
export const saveLocationSchema = z.object({
  label: labelSchema,
  point: sriLankaPointSchema
});

export type SaveLocationInput = z.input<typeof saveLocationSchema>;
export type SaveLocationData = z.output<typeof saveLocationSchema>;

/**
 * How many a buyer may keep. Not a technical limit — it is embedded in the user document, which
 * is read on every `/identity/me`, so an unbounded list would grow the hottest read in the app.
 * Twenty is far more markets than the research found anyone selling to.
 */
export const MAX_SAVED_LOCATIONS = 20;
