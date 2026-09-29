/** The buyer's Calls tab: requests they sent, and calls ready to join (FARM-24). */

import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { CallsList } from "@/features/calls/calls-list";

export default function CallsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Text className="type-h2 px-gutter pt-4 text-foreground">Calls</Text>
      <CallsList bottomInset={insets.bottom} />
    </View>
  );
}
