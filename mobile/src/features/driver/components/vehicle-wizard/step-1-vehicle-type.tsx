import type { VehicleType } from "@farm-pool/shared";

import { AppButton } from "@/components/app/app-button";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  WizardActions,
  WizardShell
} from "@/features/listings/components/create-listing/wizard-shell";

import { VEHICLES } from "../../vehicles";
import { VehicleOptionCard } from "./vehicle-option-card";

type Step1VehicleTypeProps = {
  vehicleType: VehicleType | null;
  onSelect: (id: VehicleType) => void;
  error?: string;
  /** A new driver has nowhere to go back to, so they get Log out instead of Cancel. */
  firstTime: boolean;
  onContinue: () => void;
  onCancel: () => void;
  onSignOut: () => void;
};

export function Step1VehicleType({
  vehicleType,
  onSelect,
  error,
  firstTime,
  onContinue,
  onCancel,
  onSignOut
}: Step1VehicleTypeProps) {
  return (
    <WizardShell
      step={1}
      stepCount={3}
      title="Your vehicle"
      onBack={firstTime ? undefined : onCancel}
      help="Pick the vehicle you collect produce with. You can change it later from your profile."
      footer={
        firstTime ? (
          <VStack className="gap-2">
            <AppButton label="Continue" disabled={!vehicleType} onPress={onContinue} />
            <AppButton label="Log out" variant="outline" onPress={onSignOut} />
          </VStack>
        ) : (
          <WizardActions
            onBack={onCancel}
            backLabel="Cancel"
            continueLabel="Continue"
            continueDisabled={!vehicleType}
            onContinue={onContinue}
          />
        )
      }
    >
      <VStack className="gap-1">
        <Text className="type-h2 text-foreground">What do you drive?</Text>
        <Text className="type-caption text-muted-foreground">
          Farmers see this before they hand over their produce.
        </Text>
      </VStack>

      <VStack className="gap-3" accessibilityRole="radiogroup">
        {VEHICLES.map(({ id, label, emoji, capacityKg }) => (
          <VehicleOptionCard
            key={id}
            label={label}
            emoji={emoji}
            typicalCapacityKg={capacityKg}
            selected={vehicleType === id}
            onPress={() => onSelect(id)}
          />
        ))}
      </VStack>

      {error ? <Text className="type-caption text-destructive">{error}</Text> : null}
    </WizardShell>
  );
}
