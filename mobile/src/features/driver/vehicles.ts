import type { VehicleType } from "@farm-pool/shared";

/**
 * What the vehicle wizard shows for each vehicle type. `capacityKg` is a starting point the driver
 * adjusts, not a rule — the api only checks 50 kg to 40 t — so a driver taps a card and is usually
 * one tap from done (LP-07, minimal typing).
 */
export const VEHICLES: readonly {
  id: VehicleType;
  label: string;
  emoji: string;
  capacityKg: number;
}[] = [
  { id: "motorbike", label: "Motorbike", emoji: "🏍️", capacityKg: 100 },
  { id: "three-wheeler", label: "Three-wheeler", emoji: "🛺", capacityKg: 400 },
  { id: "van", label: "Van", emoji: "🚐", capacityKg: 1500 },
  { id: "small-lorry", label: "Small lorry", emoji: "🛻", capacityKg: 3000 },
  { id: "lorry", label: "Lorry", emoji: "🚚", capacityKg: 8000 },
  { id: "tractor", label: "Tractor & trailer", emoji: "🚜", capacityKg: 2000 }
];

export function vehicleById(id: VehicleType) {
  return VEHICLES.find((vehicle) => vehicle.id === id) ?? VEHICLES[0];
}

/**
 * Sri Lanka's 25 administrative districts, so a driver taps where they work instead of typing it.
 * The api stores the name as free text, like a listing's district, so the two can be matched.
 * Mobile-only: nothing on the api side needs the list yet.
 */
export const DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya"
] as const;
