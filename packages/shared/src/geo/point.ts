import { z } from "zod";

/**
 * A place on the island, used by both ends of a delivery (FARM-26).
 *
 * One definition rather than two: a listing's farm gate and an order's drop-off are the same kind
 * of value, and a second copy of these bounds is a second place for them to drift.
 *
 * **The bounds are Sri Lanka's, and they are deliberately tight.** The characteristic failure is a
 * transposed pair — latitude 80 / longitude 7 is not an error, it is a perfectly valid point in
 * Kazakhstan, and nothing downstream would ever notice. Rejecting it here turns a silent wrong
 * destination into a form error the person who typed it can fix.
 *
 * Latitude 5.8–10.0 N, longitude 79.5–82.0 E covers the island with a small margin.
 */
export const sriLankaPointSchema = z.object({
  latitude: z
    .number()
    .min(5.8, "That is south of Sri Lanka — check the pin")
    .max(10.0, "That is north of Sri Lanka — check the pin"),
  longitude: z
    .number()
    .min(79.5, "That is west of Sri Lanka — check the pin")
    .max(82.0, "That is east of Sri Lanka — check the pin")
});

export type GeoPoint = z.infer<typeof sriLankaPointSchema>;

/**
 * Straight-line kilometres between two points (haversine).
 *
 * Deliberately not road distance. A route needs the billed Directions API and a network round
 * trip, and this exists so a driver can see at a glance whether a job is a village away or across
 * the country — "about 40 km" answers that, and the maps app answers the rest. Labelling it as
 * straight-line where it is shown matters: a Sri Lankan hill road is routinely half as long again.
 */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
