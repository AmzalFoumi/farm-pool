import { z } from "zod";

/**
 *   A constant, not a collection, on purpose: both sides need the same names and icons, nobody edits
 * the list at runtime yet, and the coordinator's "benchmark price per crop" is not built. When crops
 * gain per-region prices or admin editing, this becomes a `crops` collection in `api/` and the ids
 * below become its stable keys — screens keep reading `cropById` either way.
 *
 * Icons are emoji until the team settles iconography (`.plans/DECISIONS.md`, open question 1) and
 * image storage. `CropTile` in the app renders the emoji.
 *
 **/
export const CROP_CATEGORIES = ["Vegetables", "Fruits", "Grains", "Herbs", "Other"] as const;

export type CropCategory = (typeof CROP_CATEGORIES)[number];

export const CROPS = [
  {
    id: "onion",
    name: "Big onion",
    emoji: "🧅",
    category: "Vegetables",
    varieties: ["Red Local", "Yellow Bulb", "Shallot", "Imported Big"]
  },
  {
    id: "carrot",
    name: "Carrot",
    emoji: "🥕",
    category: "Vegetables",
    varieties: ["Nantes", "Chantenay", "Imperator", "Local Organic"]
  },
  {
    id: "tomato",
    name: "Tomatoes",
    emoji: "🍅",
    category: "Vegetables",
    varieties: ["Roma / Plum", "Cherry / Grape", "Beefsteak", "Local / Heirloom"]
  },
  {
    id: "green-chilli",
    name: "Green chillies",
    emoji: "🌶️",
    category: "Vegetables",
    varieties: ["MHM Chilli", "Jaffna Hot", "Bird's Eye", "Green Bullet"]
  },
  {
    id: "leeks",
    name: "Leeks",
    emoji: "🥬",
    category: "Vegetables",
    varieties: ["Giant Musselburgh", "Bandit", "Local Green"]
  },
  {
    id: "beans",
    name: "Green Beans",
    emoji: "🫘",
    category: "Vegetables",
    varieties: ["Bush Beans", "Pole Beans", "French Green"]
  },
  {
    id: "brinjal",
    name: "Brinjal",
    emoji: "🍆",
    category: "Vegetables",
    varieties: ["Purple Long", "Green Oval", "Black Beauty", "Local Striped"]
  },
  {
    id: "pumpkin",
    name: "Pumpkin",
    emoji: "🎃",
    category: "Vegetables",
    varieties: ["Arjun Hybrid", "Local Sweet", "Butternut", "Giant Orange"]
  },
  {
    id: "potato",
    name: "Potato",
    emoji: "🥔",
    category: "Vegetables",
    varieties: ["Granola", "Desiree", "Nuwara Eliya Special"]
  },
  {
    id: "mango",
    name: "Mango",
    emoji: "🥭",
    category: "Fruits",
    varieties: ["Karthakolomban", "Tom EJC", "Willard", "Kohu"]
  },
  {
    id: "banana",
    name: "Banana",
    emoji: "🍌",
    category: "Fruits",
    varieties: ["Embul", "Kolikuttu", "Seeni", "Ambul"]
  },
  {
    id: "papaya",
    name: "Papaya",
    emoji: "🍈",
    category: "Fruits",
    varieties: ["Red Lady", "Rathna", "Solo"]
  },
  {
    id: "rice",
    name: "Rice (paddy)",
    emoji: "🌾",
    category: "Grains",
    varieties: ["Samba", "Nadu", "Kalu Heenati", "Suwandel"]
  },
  {
    id: "coconut",
    name: "Coconut",
    emoji: "🥥",
    category: "Other",
    varieties: ["King Coconut (Thambili)", "Commercial Hybrid", "Tall Green"]
  }
] as const;

export interface Crop {
  readonly id: CropId;
  readonly name: string;
  readonly emoji: string;
  readonly category: CropCategory;
  readonly varieties: readonly string[];
}

export type CropId = (typeof CROPS)[number]["id"];

export const CROP_IDS = CROPS.map((crop) => crop.id) as [CropId, ...CropId[]];

export const cropIdSchema = z.enum(CROP_IDS);

const BY_ID: Readonly<Record<CropId, Crop>> = Object.fromEntries(
  CROPS.map((crop) => [crop.id, crop])
) as unknown as Record<CropId, Crop>;

export function cropById(id: CropId): Crop {
  return BY_ID[id];
}
