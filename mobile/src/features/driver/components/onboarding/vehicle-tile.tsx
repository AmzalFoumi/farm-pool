import { useTranslation } from "react-i18next";

import { CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * One vehicle in the 2x2 grid on step 3 (Figma 196:6319 and siblings).
 *
 * Distinct from `vehicle-wizard/vehicle-option-card.tsx`, which is a full-width row with the
 * capacity as a subtitle. This design puts four choices on one screenful so a driver compares
 * them at a glance instead of scrolling a list — a different shape, not a variant, so it is a
 * separate component rather than a `layout` prop on that one.
 *
 * The tile carries the whole tap target; the check badge is decorative confirmation, with
 * selection announced through `accessibilityState` instead.
 */
export function VehicleTile({
  label,
  emoji,
  capacityKg,
  selected,
  onPress
}: {
  label: string;
  emoji: string;
  capacityKg: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={t("driverSignUp.vehicle.tileLabel", { label, count: capacityKg })}
      className={[
        "h-[120px] flex-1 justify-between rounded-card p-3.5",
        selected ? "border-2 border-primary bg-secondary" : "border border-border bg-card"
      ].join(" ")}
    >
      <Text className="type-h3">{emoji}</Text>

      <VStack className="gap-0.5">
        <Text
          className={`type-body-bold ${selected ? "text-primary" : "text-foreground"}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text className="type-body-sm text-muted-foreground">
          {t("driverSignUp.vehicle.capacity", { count: capacityKg })}
        </Text>
      </VStack>

      {selected ? (
        <Box className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-pill bg-primary">
          <CheckIcon />
        </Box>
      ) : null}
    </Pressable>
  );
}
