import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type ReviewRowProps = {
  label: string;
  value: string;
  onEdit: () => void;
};

/** One answer on the review step; the whole row is the tap target that jumps back to its step. */
export function ReviewRow({ label, value, onEdit }: ReviewRowProps) {
  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}. Tap to change.`}
      className="min-h-tap flex-row items-center justify-between gap-3"
    >
      <VStack className="flex-1">
        <Text className="type-caption text-muted-foreground">{label}</Text>
        <Text className="type-body-bold text-foreground">{value}</Text>
      </VStack>
      <Text className="type-body-sm-bold text-primary">Edit</Text>
    </Pressable>
  );
}
