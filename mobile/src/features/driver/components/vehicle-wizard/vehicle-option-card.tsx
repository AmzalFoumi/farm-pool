import { CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type VehicleOptionCardProps = {
  label: string;
  emoji: string;
  typicalCapacityKg: number;
  selected: boolean;
  onPress: () => void;
};

/** One vehicle type on step 1: a full-width radio row, the same anatomy as the role picker. */
export function VehicleOptionCard({
  label,
  emoji,
  typicalCapacityKg,
  selected,
  onPress
}: VehicleOptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className={[
        "min-h-tap flex-row items-center gap-3.5 rounded-card p-3",
        selected ? "border-2 border-primary bg-secondary" : "border border-border bg-card"
      ].join(" ")}
    >
      <Box className="h-12 w-12 items-center justify-center rounded-field bg-secondary">
        <Text className="type-h3">{emoji}</Text>
      </Box>
      <VStack className="flex-1 gap-0.5">
        <Text className={`type-body-bold ${selected ? "text-primary" : "text-foreground"}`}>
          {label}
        </Text>
        <Text className="type-caption text-muted-foreground">
          Usually up to {typicalCapacityKg.toLocaleString()} kg
        </Text>
      </VStack>
      {selected ? (
        <Box className="h-7 w-7 items-center justify-center rounded-pill bg-primary">
          <CheckIcon />
        </Box>
      ) : null}
    </Pressable>
  );
}
