/**
 * Sri Lanka's 25 administrative districts and roughly where each one is.
 *
 * WHY THIS EXISTS: a listing records `district` and `town` as free text and nothing anywhere holds
 * a coordinate (`.plans/DATA-MODEL.md`, "Not modelled yet"). A driver still has to be shown where
 * a pickup is, so the district name is resolved to its administrative centre and the map is
 * honest about the precision: this is the district, not the farm gate.
 *
 * WHY A TABLE AND NOT GEOCODING: a geocoding call needs a network round trip and a billed API key
 * for a value that never changes. Twenty-five fixed places belong in the bundle, where they work
 * on a phone with no signal — which is the condition the whole app is designed for
 * (`.plans/PRODUCT.md`, LP-90). Real farm-gate coordinates, when a story adds them to a listing,
 * replace this per-listing and should be preferred wherever present.
 *
 * Coordinates are each district's principal town, to roughly 3 decimal places (~100 m), which is
 * far finer than the district-level claim being made.
 */

export type DistrictPoint = {
  /** Canonical spelling, for display. */
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
};

export const DISTRICT_POINTS: readonly DistrictPoint[] = [
  // Western
  { name: "Colombo", latitude: 6.9271, longitude: 79.8612 },
  { name: "Gampaha", latitude: 7.0873, longitude: 79.999 },
  { name: "Kalutara", latitude: 6.5854, longitude: 79.9607 },
  // Central
  { name: "Kandy", latitude: 7.2906, longitude: 80.6337 },
  { name: "Matale", latitude: 7.4675, longitude: 80.6234 },
  { name: "Nuwara Eliya", latitude: 6.9497, longitude: 80.7891 },
  // Southern
  { name: "Galle", latitude: 6.0535, longitude: 80.221 },
  { name: "Matara", latitude: 5.9549, longitude: 80.555 },
  { name: "Hambantota", latitude: 6.1429, longitude: 81.1212 },
  // Northern
  { name: "Jaffna", latitude: 9.6615, longitude: 80.0255 },
  { name: "Kilinochchi", latitude: 9.3961, longitude: 80.3982 },
  { name: "Mannar", latitude: 8.9772, longitude: 79.9044 },
  { name: "Vavuniya", latitude: 8.7514, longitude: 80.4971 },
  { name: "Mullaitivu", latitude: 9.2671, longitude: 80.8142 },
  // Eastern
  { name: "Batticaloa", latitude: 7.7102, longitude: 81.6924 },
  { name: "Ampara", latitude: 7.2917, longitude: 81.6747 },
  { name: "Trincomalee", latitude: 8.5874, longitude: 81.2152 },
  // North Western
  { name: "Kurunegala", latitude: 7.4863, longitude: 80.3647 },
  { name: "Puttalam", latitude: 8.0362, longitude: 79.8283 },
  // North Central
  { name: "Anuradhapura", latitude: 8.3114, longitude: 80.4037 },
  { name: "Polonnaruwa", latitude: 7.9403, longitude: 81.0188 },
  // Uva
  { name: "Badulla", latitude: 6.9895, longitude: 81.0557 },
  { name: "Monaragala", latitude: 6.8728, longitude: 81.351 },
  // Sabaragamuwa
  { name: "Ratnapura", latitude: 6.7056, longitude: 80.3847 },
  { name: "Kegalle", latitude: 7.2513, longitude: 80.3464 }
];

/** Every district name, for a picker or a filter. */
export const DISTRICT_NAMES = DISTRICT_POINTS.map((d) => d.name);

/**
 * Find a district by however it was typed. Returns `undefined` for a name that is not one of the
 * 25 — the field is free text, so "Kurunegala District", a misspelling or a town name all reach
 * here, and the caller shows no map rather than a confidently wrong one.
 *
 * Matching is deliberately forgiving about case, surrounding space and internal spacing
 * ("nuwara  eliya"), because those are typing differences rather than different places. It is not
 * forgiving about spelling: a fuzzy match that silently puts a pickup in the wrong district is
 * worse than no map, given a driver may act on it.
 */
export function districtPoint(name: string): DistrictPoint | undefined {
  const wanted = normalize(name);
  return DISTRICT_POINTS.find((d) => normalize(d.name) === wanted);
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
