/**
 * Temporary listing data for the wholesale-buyer screens.
 *
 * These are the rows the high-fidelity wireframe draws, hard-coded. There is no
 * backend yet: persistence is still open question 1 in `.plans/DECISIONS.md`,
 * and building a fetch layer against a database nobody has chosen would quietly
 * close that decision.
 *
 * When the API exists, this file is deleted and the `Listing` type moves to
 * `packages/shared` — at that point, and not before, because `api/` will be the
 * second workspace that needs it.
 */

const LISTINGS = [
  {
    id: "l1",
    crop: "Tomatoes",
    emoji: "🍅",
    farmer: "Nimal Perera",
    place: "Galewela",
    distanceKm: 12,
    pricePerKg: 180,
    quantityKg: 120,
    memberSince: 2021
  },
  {
    id: "l2",
    crop: "Green chillies",
    emoji: "🌶️",
    farmer: "Kamala Ratnayake",
    place: "Kekirawa",
    distanceKm: 24,
    pricePerKg: 420,
    quantityKg: 45,
    memberSince: 2022
  },
  {
    id: "l3",
    crop: "Brinjal",
    emoji: "🍆",
    farmer: "Sunil Bandara",
    place: "Galewela",
    distanceKm: 12,
    pricePerKg: 240,
    quantityKg: 80,
    memberSince: 2019
  },
  {
    id: "l4",
    crop: "Mango",
    emoji: "🥭",
    farmer: "Anura Silva",
    place: "Naula",
    distanceKm: 30,
    pricePerKg: 320,
    quantityKg: 200,
    memberSince: 2020
  },
  {
    id: "l5",
    crop: "Pumpkin",
    emoji: "🎃",
    farmer: "Ranjith Ekanayake",
    place: "Dambulla",
    distanceKm: 8,
    pricePerKg: 90,
    quantityKg: 350,
    memberSince: 2018
  },
  {
    id: "l6",
    crop: "Carrot",
    emoji: "🥕",
    farmer: "Priyanka Jayasena",
    place: "Matale",
    distanceKm: 41,
    pricePerKg: 260,
    quantityKg: 60,
    memberSince: 2023
  }
] as const;

export type Listing = (typeof LISTINGS)[number];

export { LISTINGS };

/** Rs 180 — one place, so the grid, the list and the detail screen cannot drift. */
export function formatPrice(rupees: number) {
  return `Rs ${rupees}`;
}
