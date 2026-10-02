import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";

/** A label on the left, its value on the right — one line of the vehicle card. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack className="items-center justify-between gap-3">
      <Text className="type-body text-muted-foreground">{label}</Text>
      <Text className="type-body-bold text-right text-foreground">{value}</Text>
    </HStack>
  );
}
