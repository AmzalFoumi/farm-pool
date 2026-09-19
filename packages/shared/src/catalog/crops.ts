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
export const CROP_CATEGORIES = ["All", "Vegetables", "Fruits", "Grains", "Herbs", "Other"] as const;

export type CropCategory = (typeof CROP_CATEGORIES)[number];

export const CROPS = [
  {
    id: "onion",
    name: "Big onion",
    emoji: "🧅",
    category: "Vegetables",
    highDemand: true,
    isPopular: true,
    varieties: ["Red Local", "Yellow Bulb", "Shallot", "Imported Big"]
  },
  {
    id: "carrot",
    name: "Carrot",
    emoji: "🥕",
    category: "Vegetables",
    highDemand: false,
    isPopular: true,
    varieties: ["Nantes", "Chantenay", "Imperator", "Local Organic"]
  },
  {
    id: "tomato",
    name: "Tomatoes",
    emoji: "🍅",
    category: "Vegetables",
    highDemand: true,
    isPopular: true,
    varieties: ["Roma / Plum", "Cherry / Grape", "Beefsteak", "Local / Heirloom"]
  },
  {
    id: "green-chilli",
    name: "Green chillies",
    emoji: "🌶️",
    category: "Vegetables",
    highDemand: true,
    isPopular: true,
    varieties: ["MHM Chilli", "Jaffna Hot", "Bird's Eye", "Green Bullet"]
  },
  {
    id: "leeks",
    name: "Leeks",
    emoji: "🥬",
    category: "Vegetables",
    highDemand: false,
    isPopular: false,
    varieties: ["Giant Musselburgh", "Bandit", "Local Green"]
  },
  {
    id: "beans",
    name: "Green Beans",
    emoji: "🫘",
    category: "Vegetables",
    highDemand: false,
    isPopular: false,
    varieties: ["Bush Beans", "Pole Beans", "French Green"]
  },
  {
    id: "brinjal",
    name: "Brinjal",
    emoji: "🍆",
    category: "Vegetables",
    highDemand: false,
    isPopular: false,
    varieties: ["Purple Long", "Green Oval", "Black Beauty", "Local Striped"]
  },
  {
    id: "pumpkin",
    name: "Pumpkin",
    emoji: "🎃",
    category: "Vegetables",
    highDemand: false,
    isPopular: false,
    varieties: ["Arjun Hybrid", "Local Sweet", "Butternut", "Giant Orange"]
  },
  {
    id: "potato",
    name: "Potato",
    emoji: "🥔",
    category: "Vegetables",
    highDemand: false,
    isPopular: true,
    varieties: ["Granola", "Desiree", "Nuwara Eliya Special"]
  },
  {
    id: "mango",
    name: "Mango",
    emoji: "🥭",
    category: "Fruits",
    highDemand: true,
    isPopular: true,
    varieties: ["Karthakolomban", "Tom EJC", "Willard", "Kohu"]
  },
  {
    id: "banana",
    name: "Banana",
    emoji: "🍌",
    category: "Fruits",
    highDemand: false,
    isPopular: true,
    varieties: ["Embul", "Kolikuttu", "Seeni", "Ambul"]
  },
  {
    id: "papaya",
    name: "Papaya",
    emoji: "🍈",
    category: "Fruits",
    highDemand: false,
    isPopular: false,
    varieties: ["Red Lady", "Rathna", "Solo"]
  },
  {
    id: "rice",
    name: "Rice (paddy)",
    emoji: "🌾",
    category: "Grains",
    highDemand: true,
    isPopular: true,
    varieties: ["Samba", "Nadu", "Kalu Heenati", "Suwandel"]
  },
  {
    id: "coconut",
    name: "Coconut",
    emoji: "🥥",
    category: "Other",
    highDemand: true,
    isPopular: true,
    varieties: ["King Coconut (Thambili)", "Commercial Hybrid", "Tall Green"]
  }
] as const;

export interface Crop {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly category: CropCategory;
  readonly highDemand?: boolean;
  readonly isPopular?: boolean;
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
