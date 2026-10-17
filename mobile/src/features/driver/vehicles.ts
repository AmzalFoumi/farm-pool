import type { VehicleType } from "@farm-pool/shared";

/**
 * What the vehicle pickers show for each vehicle type.
 *
 * `capacityKg` plays two roles. In the FARM-45 wizard it is a starting point the driver adjusts —
 * the api only checks 50 kg to 40 t. In the sign-up flow (Figma 196:6306) there is no capacity
 * field at all, so it is the value that gets stored, and it is what the job board then filters a
 * driver's work by. The four figures the design puts on its tiles are therefore authoritative,
 * and are used verbatim below; `motorbike` and `van` keep their earlier estimates because the
 * design does not name them.
 */
export const VEHICLES: readonly {
  id: VehicleType;
  emoji: string;
  capacityKg: number;
}[] = [
  { id: "motorbike", emoji: "🏍️", capacityKg: 100 },
  { id: "three-wheeler", emoji: "🛺", capacityKg: 300 },
  { id: "van", emoji: "🚐", capacityKg: 1500 },
  { id: "small-lorry", emoji: "🛻", capacityKg: 1500 },
  { id: "lorry", emoji: "🚚", capacityKg: 5000 },
  { id: "tractor", emoji: "🚜", capacityKg: 2500 }
];

/**
 * The translation key for a vehicle type's name — `t(vehicleLabelKey(id))`.
 *
 * The name is deliberately *not* a field on the table above. This module is plain TypeScript with
 * no React, so it cannot call `useTranslation`, and a `label` here is a string that silently stays
 * English in a Sinhala or Tamil UI — which is what it did until FARM-58. The `vehicles.*` keys are
 * named after the `VehicleType` ids, so the mapping needs no table of its own.
 */
export function vehicleLabelKey(id: VehicleType) {
  return `vehicles.${id}` as const;
}

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
