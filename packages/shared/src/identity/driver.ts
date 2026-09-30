import { z } from "zod";

import { districtSchema } from "../catalog/listing";

/**
 * A delivery partner's vehicle and verification state (FARM-45).
 *
 * WHY IT IS NOT IN `registerSchema`: that object is shared by all four roles and by both the form
 * and the api pipe, so a required vehicle field there would break the other three sign-ups. A
 * driver creates the account first, then fills this in on its own endpoint
 * (`PUT /identity/me/vehicle`). See `docs/logistics-driver-role.md`, LP-09.
 *
 * The contact number LP-02 asks for is the account's `phone` — one number per person, already
 * verified as a Sri Lankan number at sign-up — so it is not asked for twice.
 */

/** Fixed list so a coordinator can filter by it and a batch can be matched to a vehicle's size. */
export const VEHICLE_TYPES = [
  "motorbike",
  "three-wheeler",
  "van",
  "small-lorry",
  "lorry",
  "tractor"
] as const;
export const vehicleTypeSchema = z.enum(VEHICLE_TYPES);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

/**
 * Sri Lankan plates are written many ways — `WP CAB-1234`, `CAB 1234`, `65-1234`, `300-1234` — so
 * the check is loose on shape and strict on characters: letters, digits, spaces and hyphens, and at
 * least one digit. Stored upper-cased with single spaces so the same plate typed twice matches.
 *
 * Latin letters only for now: pre-2000 plates carry the Sinhala ශ්‍රී, which a driver types as
 * "SRI". Revisit with the Sinhala and Tamil localisation work (LP-91).
 */
export const vehicleRegistrationSchema = z
  .string()
  .trim()
  .transform((plate) => plate.replace(/\s+/g, " ").toUpperCase())
  .pipe(
    z
      .string()
      .min(4, "Enter the number on the plate")
      .max(14, "That number is too long")
      .regex(/^[A-Z0-9 -]+$/, "Use letters, numbers and hyphens only")
      .regex(/\d/, "A plate number has digits in it")
  );

/** 50 kg is a motorbike with panniers; 40 t is the largest lorry allowed on a Sri Lankan road. */
export const vehicleCapacityKgSchema = z
  .number()
  .int("Use whole kilograms")
  .min(50, "At least 50 kg")
  .max(40_000, "That is more than any lorry can carry");

/** What the driver submits. */
export const driverVehicleSchema = z.object({
  vehicleType: vehicleTypeSchema,
  registration: vehicleRegistrationSchema,
  capacityKg: vehicleCapacityKgSchema,
  /** The district they collect in. Free text, like a listing's district, so the two match. */
  operatingDistrict: districtSchema
});

/** What the wizard holds (plate as typed). */
export type DriverVehicleInput = z.input<typeof driverVehicleSchema>;
/** What the api receives after parsing (plate normalised). */
export type DriverVehicle = z.output<typeof driverVehicleSchema>;

/**
 * Where a driver's check stands. There is no `unverified`: a driver who has not submitted a
 * vehicle has no `driver` object at all, and the app sends them to the vehicle wizard (LP-10).
 *
 * Only `pending` is written today. WHAT verification checks, and who moves a driver to `verified`
 * or `rejected`, is undecided (`.plans/DECISIONS.md`, `docs/logistics-driver-role.md` §1) — the
 * enum is here so that decision needs no migration.
 */
export const driverVerificationSchema = z.enum(["pending", "verified", "rejected"]);
export type DriverVerification = z.infer<typeof driverVerificationSchema>;

/** The vehicle as stored and returned: the submission plus its verification state. */
export const driverProfileSchema = driverVehicleSchema.extend({
  registration: z.string(),
  verification: driverVerificationSchema,
  updatedAt: z.iso.datetime()
});

export type DriverProfile = z.infer<typeof driverProfileSchema>;
