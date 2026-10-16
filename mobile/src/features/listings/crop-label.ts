import type { CropCategory, CropId } from "@farm-pool/shared";

/**
 * Translation keys for a crop's name and its category (FARM-58).
 *
 * `packages/shared/src/catalog/crops.ts` carries an English `name` per crop, and it has to: the
 * api and the seed data read the same table, and a key is meaningless on that side. But a farmer
 * posting tomatoes in a Sinhala UI was reading "Tomatoes" — the one word on the screen they most
 * need in their own language. So the name stays in `shared` as the English label and the id
 * doubles as a translation key here, the same arrangement as `vehicleLabelKey`.
 *
 * **Display only.** `crop.name` is still the right thing to pass to anything that *matches* on a
 * crop — `compareToBenchmark` keys its price table by the English name, and sending it a
 * translated one would silently find no benchmark. Use these keys where a person reads the word,
 * and `crop.name` where code compares it.
 */
export function cropLabelKey(id: CropId) {
  return `crops.${id}` as const;
}

/** `CropCategory` is also a stored value, so the same split applies: translate for display only. */
export function cropCategoryKey(category: CropCategory | "All") {
  return `cropCategories.${category}` as const;
}
