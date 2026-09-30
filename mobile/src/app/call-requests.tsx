/**
 * "/call-requests" — the farmer's call requests (FARM-24). Not "/calls": the buyer tab already owns that path. Farmers have no Calls tab: their tab bar is
 * already at Android's five-tab limit, so this screen is reached from Home's Quick Actions.
 */

import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { CallsList } from "@/features/calls/calls-list";

export default function FarmerCallsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Call requests" />
      <CallsList bottomInset={insets.bottom} />
    </View>
  );
}
