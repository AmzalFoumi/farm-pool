import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

type DistrictChipProps = {
  name: string;
  selected: boolean;
  onPress: () => void;
};

/** One district on step 3: a tap-target-sized radio chip. */
export function DistrictChip({ name, selected, onPress }: DistrictChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={[
        "min-h-tap justify-center rounded-chip px-4",
        selected ? "bg-secondary" : "bg-card-muted"
      ].join(" ")}
    >
      <Text className={`type-body-sm-bold ${selected ? "text-primary" : "text-foreground"}`}>
        {name}
      </Text>
    </Pressable>
  );
}
