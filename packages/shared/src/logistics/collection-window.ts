import { z } from "zod";

/**
 * When a load is collected (FARM-61).
 *
 * THE RULE THIS FILE EXISTS FOR: **a time a farmer is given is a commitment, not a prediction.**
 *
 * A driver can hold several jobs at once. If the time shown to a farmer were recomputed from the
 * driver's current queue, every new job the driver accepted would silently push back every promise
 * already made — and the farmer who was told 2 pm harvested that morning so the produce would be
 * fresh. Produce standing in the sun is a real loss, and it gets worse the more work the driver
 * takes, which is exactly what the app otherwise encourages.
 *
 * So the model is: the farmer offers a window they can be ready for, the driver commits to a slot
 * inside it, and that commitment is immovable by anything except an explicit change the farmer is
 * told about. A new job has to fit in the slack around commitments already made, or it cannot be
 * accepted at all.
 *
 * WHY WINDOWS AND NOT POINT ETAs: a window survives what a prediction cannot — a 3G dead zone, a
 * flat tyre, a farmer whose phone is off. For this user base that robustness is worth more than
 * precision (LP-90), and the Figma driver screens already show windows with visible slack rather
 * than a live ETA.
 */

/**
 * Minutes from midnight, local time.
 *
 * Deliberately not a `Date` or an ISO datetime. A collection window is a *wall-clock* fact about a
 * farm — "the gate is open from 6 am" — and nobody in this story crosses a timezone. Storing an
 * instant would invite a UTC conversion that silently shifts the window by 5½ hours, which is the
 * difference between a farmer waiting at dawn and waiting at noon. The calendar day is carried
 * separately by `date`.
 */
export const minutesOfDaySchema = z
  .number()
  .int("Use whole minutes")
  .min(0, "That is before midnight")
  .max(24 * 60 - 1, "That is after midnight");

/** `6 * 60` → `"6:00 am"`. One implementation so a farmer and a driver read the same string. */
export function formatMinutesOfDay(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * The window a farmer can be ready in, offered on the listing.
 *
 * Wide by design — "today, 6 am to 5 pm" is a perfectly good answer, and a farmer should not be
 * made to guess a narrow slot to sell produce. The narrowing happens when a driver commits.
 */
export const collectionWindowSchema = z
  .object({
    /** Calendar date, `YYYY-MM-DD`, in the farm's own day. */
    date: z.iso.date("Enter the date as YYYY-MM-DD"),
    from: minutesOfDaySchema,
    to: minutesOfDaySchema
  })
  .refine((w) => w.to > w.from, {
    path: ["to"],
    message: "The window has to end after it starts"
  });

export type CollectionWindow = z.infer<typeof collectionWindowSchema>;

/**
 * What a driver commits to when accepting — a slot inside the farmer's window.
 *
 * `MIN_COMMITTED_MINUTES` is the floor because a promise of "2:00 to 2:05" is not a promise anyone
 * can keep on a rural road; it reads as precision the driver does not have. Half an hour is narrow
 * enough for a farmer to plan a harvest around and wide enough to survive a slow gate.
 */
export const MIN_COMMITTED_MINUTES = 30;

export const committedWindowSchema = collectionWindowSchema.refine(
  (w) => w.to - w.from >= MIN_COMMITTED_MINUTES,
  {
    path: ["to"],
    message: `Commit to at least ${MIN_COMMITTED_MINUTES} minutes — a narrower promise is one a rural road will break`
  }
);

/** Two windows on the same day that overlap cannot both be kept by one vehicle. */
export function windowsOverlap(a: CollectionWindow, b: CollectionWindow): boolean {
  if (a.date !== b.date) return false;
  return a.from < b.to && b.from < a.to;
}

/** Does the inner window sit entirely inside the outer one, on the same day? */
export function windowContains(outer: CollectionWindow, inner: CollectionWindow): boolean {
  return outer.date === inner.date && inner.from >= outer.from && inner.to <= outer.to;
}
