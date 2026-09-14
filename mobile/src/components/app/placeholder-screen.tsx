import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * A tab that exists so the shell is navigable, with nothing behind it yet.
 *
 * Temporary. Delete this file once every tab has a real screen — it is not a
 * generic empty-state component and should not grow into one.
 */
export function PlaceholderScreen({ title, note }: { title: string; note: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <VStack className="flex-1 items-center justify-center gap-2 px-gutter">
        <Text className="type-h3 text-foreground">{title}</Text>
        <Text className="type-body text-center text-muted-foreground">{note}</Text>
      </VStack>
    </View>
  );
}
