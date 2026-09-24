/**
 * The units a farmer can count a batch in, and roughly how many kilograms each holds. The api
 * stores kilograms only, so every total, price and earnings figure goes through `toKg` —
 * 10 crates is 250 kg, not 10.
 */
export type BatchUnit = "kg" | "crates" | "sacks";

export const KG_PER_UNIT: Record<BatchUnit, number> = { kg: 1, crates: 25, sacks: 50 };

export function toKg(quantity: number, unit: BatchUnit): number {
  return quantity * KG_PER_UNIT[unit];
}
