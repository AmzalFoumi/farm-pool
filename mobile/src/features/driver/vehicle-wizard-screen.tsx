import {
  driverVehicleSchema,
  vehicleCapacityKgSchema,
  vehicleRegistrationSchema,
  type DriverVehicleInput,
  type VehicleType
} from "@farm-pool/shared";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";

import type { WizardStep } from "@/features/listings/components/create-listing/wizard-shell";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

import { driverApi } from "./api";
import { Step1VehicleType } from "./components/vehicle-wizard/step-1-vehicle-type";
import { Step2PlateLoad } from "./components/vehicle-wizard/step-2-plate-load";
import { Step3District } from "./components/vehicle-wizard/step-3-district";
import { StepReview } from "./components/vehicle-wizard/step-review";
import { toFieldErrors, type VehicleFieldErrors } from "./vehicle-form";
import { vehicleById } from "./vehicles";

/**
 * A delivery partner's vehicle, in three steps and a check (FARM-45, LP-02/LP-07): what they
 * drive, its plate and load, where they work. Taps, not typing, everywhere except the plate.
 *
 * This file holds the form state, validation and the save; each step is a presentational
 * component in `components/vehicle-wizard/`.
 *
 * Two ways in. A new driver lands here straight after sign-up because `(driver)/_layout.tsx`
 * keeps the tabs closed until a vehicle exists; an existing driver pushes it from Profile to edit.
 * The first finishes by going to Jobs, the second by going back.
 */
export function VehicleWizardScreen() {
  const router = useRouter();
  const auth = useAuth();
  const existing = auth.status === "signed-in" ? auth.user.driver : undefined;

  /* Read once: whether this visit started without a vehicle. `existing` changes the moment the
     save lands, and the ending depends on how the visit began, not on where it is now. */
  const [firstTime] = useState(existing === undefined);

  const [step, setStep] = useState<WizardStep>(1);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(existing?.vehicleType ?? null);
  const [registration, setRegistration] = useState(existing?.registration ?? "");
  const [capacityKg, setCapacityKg] = useState<number | null>(existing?.capacityKg ?? null);
  const [district, setDistrict] = useState<string | null>(existing?.operatingDistrict ?? null);
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  if (auth.status !== "signed-in") return null;
  /* A first save opens the tabs guard; navigate only once this render can see it open. */
  if (saved && firstTime && auth.user.driver) return <Redirect href="/driver-jobs" />;

  const vehicle = vehicleType ? vehicleById(vehicleType) : null;

  const leave = () => {
    if (router.canGoBack()) router.back();
  };

  const chooseVehicle = (id: VehicleType) => {
    setVehicleType(id);
    /* Suggest a load for the vehicle until the driver sets one themselves. */
    if (capacityKg === null || capacityKg === vehicle?.capacityKg) {
      setCapacityKg(vehicleById(id).capacityKg);
    }
  };

  const showFieldErrors = (issues: Parameters<typeof toFieldErrors>[0]) => {
    const result = toFieldErrors(issues);
    setErrors(result.errors);
    if (result.step !== null) setStep(result.step);
  };

  const continueFromPlate = () => {
    const next: VehicleFieldErrors = {};
    const plate = vehicleRegistrationSchema.safeParse(registration);
    if (!plate.success) next.registration = plate.error.issues[0]?.message;
    const load = vehicleCapacityKgSchema.safeParse(capacityKg ?? 0);
    if (!load.success) next.capacityKg = load.error.issues[0]?.message;
    setErrors(next);
    if (plate.success && load.success) {
      setRegistration(plate.data);
      setStep(3);
    }
  };

  const submit = async () => {
    setFormError(null);
    const input: DriverVehicleInput = {
      vehicleType: vehicleType ?? "motorbike",
      registration,
      capacityKg: capacityKg ?? 0,
      operatingDistrict: district ?? ""
    };
    const parsed = driverVehicleSchema.safeParse(input);
    if (!parsed.success) {
      showFieldErrors(parsed.error.issues);
      return;
    }

    setSubmitting(true);
    try {
      const user = await driverApi.saveVehicle(auth.token, input);
      auth.updateUser(user);
      if (firstTime) setSaved(true);
      else leave();
    } catch (error) {
      if (error instanceof ApiError && error.code === "validation_error") {
        showFieldErrors(error.issues);
      } else if (error instanceof ApiError && error.code === "network_error") {
        setFormError("Can't reach the server. Check your connection and try again.");
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  switch (step) {
    case 1:
      return (
        <Step1VehicleType
          vehicleType={vehicleType}
          onSelect={chooseVehicle}
          error={errors.vehicleType}
          firstTime={firstTime}
          onContinue={() => setStep(2)}
          onCancel={leave}
          onSignOut={() => auth.signOut()}
        />
      );
    case 2:
      return (
        <Step2PlateLoad
          registration={registration}
          onChangeRegistration={setRegistration}
          capacityKg={capacityKg}
          onChangeCapacity={setCapacityKg}
          vehicle={vehicle}
          errors={errors}
          onBack={() => setStep(1)}
          onContinue={continueFromPlate}
        />
      );
    case 3:
      return (
        <Step3District
          district={district}
          onSelect={setDistrict}
          error={errors.operatingDistrict}
          onBack={() => setStep(2)}
          onContinue={() => setStep("review")}
        />
      );
    default:
      return (
        <StepReview
          vehicleLabel={vehicle?.label ?? "—"}
          registration={registration}
          capacityKg={capacityKg ?? 0}
          district={district ?? "—"}
          wasVerified={existing?.verification === "verified"}
          submitting={submitting}
          error={formError}
          onEdit={setStep}
          onSubmit={submit}
        />
      );
  }
}
