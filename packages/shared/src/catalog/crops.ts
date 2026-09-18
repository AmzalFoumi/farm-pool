import { z } from "zod";

/**
 * The crops a listing or a wanted request can name.
 *
 * A constant, not a collection, on purpose: both sides need the same names and icons, nobody edits
 * the list at runtime yet, and the coordinator's "benchmark price per crop" is not built. When crops
 * gain per-region prices or admin editing, this becomes a `crops` collection in `api/` and the ids
 * below become its stable keys — screens keep reading `cropById` either way.
 *
 * Icons are emoji until the team settles iconography (`.plans/DECISIONS.md`, open question 1) and
 * image storage. `CropTile` in the app renders the emoji.
 */
export const CROPS = [
  { id: "tomato", name: "Tomatoes", emoji: "🍅" },
  { id: "green-chilli", name: "Green chillies", emoji: "🌶️" },
  { id: "brinjal", name: "Brinjal", emoji: "🍆" },
  { id: "mango", name: "Mango", emoji: "🥭" },
  { id: "pumpkin", name: "Pumpkin", emoji: "🎃" },
  { id: "carrot", name: "Carrot", emoji: "🥕" },
  { id: "banana", name: "Banana", emoji: "🍌" },
  { id: "papaya", name: "Papaya", emoji: "🍈" },
  { id: "onion", name: "Big onion", emoji: "🧅" },
  { id: "potato", name: "Potato", emoji: "🥔" },
  { id: "rice", name: "Rice (paddy)", emoji: "🌾" },
  { id: "coconut", name: "Coconut", emoji: "🥥" }
] as const;

export type Crop = (typeof CROPS)[number];
export type CropId = Crop["id"];

export const CROP_IDS = CROPS.map((crop) => crop.id) as [CropId, ...CropId[]];

export const cropIdSchema = z.enum(CROP_IDS);

const BY_ID: Readonly<Record<CropId, Crop>> = Object.fromEntries(
  CROPS.map((crop) => [crop.id, crop])
) as Record<CropId, Crop>;

export function cropById(id: CropId): Crop {
  return BY_ID[id];
}
