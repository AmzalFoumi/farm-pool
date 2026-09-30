/**
 * One pill in a horizontal filter row on the buyer's Listings screen (FARM-60).
 *
 * Selected reads as an action colour (`primary`); unselected sits on the page as a card. The whole
 * pill is the tap target and clears `min-h-tap`.
 */

import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

export function FilterChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`min-h-tap items-center justify-center rounded-pill border px-4 active:opacity-80 ${
        selected ? "border-primary bg-primary" : "border-border bg-card"
      }`}
    >
      <Text
        className={`type-body-sm-bold ${selected ? "text-primary-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
