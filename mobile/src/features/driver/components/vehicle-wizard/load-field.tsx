import { useTranslation } from "react-i18next";

import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type LoadFieldProps = {
  capacityKg: number | null;
  /** Lower-cased vehicle name for the hint, e.g. "van". */
  vehicleLabel?: string;
  error?: string;
  onPress: () => void;
};

/** The load, shown as a field-sized button that opens the numeric keypad rather than a text
 *  input, so the driver taps a round number instead of typing one. */
export function LoadField({ capacityKg, vehicleLabel, error, onPress }: LoadFieldProps) {
  const { t } = useTranslation();

  return (
    <VStack className="gap-1.5">
      <Text className="type-body-bold text-foreground">{t("vehicleWizard.load.label")}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t("vehicleWizard.load.a11y", { count: capacityKg ?? 0 })}
        className={[
          "h-control flex-row items-center justify-between rounded-field bg-card px-4",
          error ? "border-2 border-destructive" : "border border-border"
        ].join(" ")}
      >
        <Text className="type-body-lg text-foreground">
          {capacityKg !== null
            ? t("common.kg", { count: capacityKg })
            : t("vehicleWizard.load.unset")}
        </Text>
        <Text className="type-body-bold text-primary">{t("vehicleWizard.load.change")}</Text>
      </Pressable>
      {error ? (
        <Text className="type-caption text-destructive">{error}</Text>
      ) : (
        <Text className="type-caption text-muted-foreground">
          {t("vehicleWizard.load.hint", {
            vehicle: vehicleLabel ?? t("profile.vehicle").toLowerCase()
          })}
        </Text>
      )}
    </VStack>
  );
}
