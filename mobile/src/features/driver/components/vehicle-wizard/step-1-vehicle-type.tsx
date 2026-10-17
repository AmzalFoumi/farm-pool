import type { VehicleType } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/app/app-button";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  WizardActions,
  WizardShell
} from "@/features/listings/components/create-listing/wizard-shell";

import { VEHICLES, vehicleLabelKey } from "../../vehicles";
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
  const { t } = useTranslation();

  return (
    <WizardShell
      step={1}
      stepCount={3}
      title={t("vehicleWizard.step1.title")}
      onBack={firstTime ? undefined : onCancel}
      help={t("vehicleWizard.step1.help")}
      footer={
        firstTime ? (
          <VStack className="gap-2">
            <AppButton label={t("common.continue")} disabled={!vehicleType} onPress={onContinue} />
            <AppButton label={t("profile.logOut")} variant="outline" onPress={onSignOut} />
          </VStack>
        ) : (
          <WizardActions
            onBack={onCancel}
            backLabel={t("vehicleWizard.cancel")}
            continueLabel={t("common.continue")}
            continueDisabled={!vehicleType}
            onContinue={onContinue}
          />
        )
      }
    >
      <VStack className="gap-1">
        <Text className="type-h2 text-foreground">{t("vehicleWizard.step1.heading")}</Text>
        <Text className="type-caption text-muted-foreground">{t("vehicleWizard.step1.note")}</Text>
      </VStack>

      <VStack className="gap-3" accessibilityRole="radiogroup">
        {VEHICLES.map(({ id, emoji, capacityKg }) => (
          <VehicleOptionCard
            key={id}
            label={t(vehicleLabelKey(id))}
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
