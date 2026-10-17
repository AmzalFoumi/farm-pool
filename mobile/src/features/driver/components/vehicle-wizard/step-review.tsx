import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  WizardActions,
  WizardShell,
  type WizardStep
} from "@/features/listings/components/create-listing/wizard-shell";

import { ReviewRow } from "./review-row";

type StepReviewProps = {
  vehicleLabel: string;
  registration: string;
  capacityKg: number;
  district: string;
  /** Whether the vehicle being edited is already verified — changing it means a new check. */
  wasVerified: boolean;
  submitting: boolean;
  error: string | null;
  onEdit: (step: WizardStep) => void;
  onSubmit: () => void;
};

export function StepReview({
  vehicleLabel,
  registration,
  capacityKg,
  district,
  wasVerified,
  submitting,
  error,
  onEdit,
  onSubmit
}: StepReviewProps) {
  const { t } = useTranslation();

  return (
    <WizardShell
      step="review"
      stepCount={3}
      title={t("vehicleWizard.review.title")}
      onBack={() => onEdit(3)}
      footer={
        <WizardActions
          onBack={() => onEdit(3)}
          continueLabel={t(
            submitting ? "vehicleWizard.review.saving" : "vehicleWizard.review.save"
          )}
          continueDisabled={submitting}
          onContinue={onSubmit}
        />
      }
    >
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <ReviewRow
          label={t("vehicleWizard.row.vehicle")}
          value={vehicleLabel}
          onEdit={() => onEdit(1)}
        />
        <Box className="h-px bg-border" />
        <ReviewRow
          label={t("vehicleWizard.row.plate")}
          value={registration}
          onEdit={() => onEdit(2)}
        />
        <Box className="h-px bg-border" />
        <ReviewRow
          label={t("vehicleWizard.row.load")}
          value={`${capacityKg.toLocaleString()} kg`}
          onEdit={() => onEdit(2)}
        />
        <Box className="h-px bg-border" />
        <ReviewRow
          label={t("vehicleWizard.row.district")}
          value={district}
          onEdit={() => onEdit(3)}
        />
      </VStack>

      <Text className="type-caption text-muted-foreground">
        {t(wasVerified ? "vehicleWizard.review.noteVerified" : "vehicleWizard.review.noteFirst")}
      </Text>

      {error ? (
        <Text className="type-body text-destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </WizardShell>
  );
}
