import type { DriverVehicleInput } from "@farm-pool/shared";

import type { WizardStep } from "@/features/listings/components/create-listing/wizard-shell";

/** The vehicle wizard's form: which field has which message, and which step owns it. */
export type VehicleField = keyof DriverVehicleInput;
export type VehicleFieldErrors = Partial<Record<VehicleField, string>>;

/** Which step owns each field, so an api `validation_error` sends the driver back to it. */
export const STEP_OF: Record<VehicleField, WizardStep> = {
  vehicleType: 1,
  registration: 2,
  capacityKg: 2,
  operatingDistrict: 3
};

/** First message per field, from zod issues or the api's `issues`, plus the earliest step that
 *  has one (or `null` when none of them belong to a known field). */
export function toFieldErrors(
  issues: readonly { path: PropertyKey[] | string; message: string }[]
): { errors: VehicleFieldErrors; step: WizardStep | null } {
  const errors: VehicleFieldErrors = {};
  for (const issue of issues) {
    const key = (Array.isArray(issue.path) ? issue.path[0] : issue.path) as
      VehicleField | undefined;
    if (key && key in STEP_OF && !errors[key]) errors[key] = issue.message;
  }
  const steps = (Object.keys(errors) as VehicleField[]).map((field) => STEP_OF[field] as number);
  return { errors, step: steps.length > 0 ? (Math.min(...steps) as WizardStep) : null };
}

/** Four round numbers around a vehicle's usual load, for the keypad's quick picks. */
export function loadPresets(typical: number): number[] {
  return [0.5, 1, 1.5, 2].map((factor) => Math.max(50, Math.round((typical * factor) / 50) * 50));
}
