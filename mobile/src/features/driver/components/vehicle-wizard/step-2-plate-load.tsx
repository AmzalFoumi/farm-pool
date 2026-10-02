import { useState } from "react";

import { AppTextField } from "@/components/app/app-text-field";
import { NumericKeypadModal } from "@/components/app/numeric-keypad-modal";
import {
  WizardActions,
  WizardShell
} from "@/features/listings/components/create-listing/wizard-shell";

import { loadPresets, type VehicleFieldErrors } from "../../vehicle-form";
import { LoadField } from "./load-field";

type Step2PlateLoadProps = {
  registration: string;
  onChangeRegistration: (plate: string) => void;
  capacityKg: number | null;
  onChangeCapacity: (kg: number) => void;
  /** The chosen vehicle, for the keypad's quick picks and the hint. */
  vehicle: { label: string; capacityKg: number } | null;
  errors: VehicleFieldErrors;
  onBack: () => void;
  onContinue: () => void;
};

export function Step2PlateLoad({
  registration,
  onChangeRegistration,
  capacityKg,
  onChangeCapacity,
  vehicle,
  errors,
  onBack,
  onContinue
}: Step2PlateLoadProps) {
  const [keypadOpen, setKeypadOpen] = useState(false);

  return (
    <WizardShell
      step={2}
      stepCount={3}
      title="Plate and load"
      onBack={onBack}
      help="The plate number is checked before you are verified. The load is how much you can carry in one trip."
      footer={<WizardActions onBack={onBack} continueLabel="Continue" onContinue={onContinue} />}
      overlay={
        <NumericKeypadModal
          isOpen={keypadOpen}
          onClose={() => setKeypadOpen(false)}
          title="How much can you carry?"
          unitLabel="kg"
          initialValue={capacityKg ?? vehicle?.capacityKg ?? 0}
          presets={loadPresets(vehicle?.capacityKg ?? 1000)}
          onConfirm={onChangeCapacity}
        />
      }
    >
      <AppTextField
        label="Plate number"
        value={registration}
        onChangeText={onChangeRegistration}
        error={errors.registration}
        placeholder="e.g. WP CAB-1234"
        autoCapitalize="characters"
        autoComplete="off"
        returnKeyType="done"
      />

      <LoadField
        capacityKg={capacityKg}
        vehicleLabel={vehicle?.label.toLowerCase()}
        error={errors.capacityKg}
        onPress={() => setKeypadOpen(true)}
      />
    </WizardShell>
  );
}
