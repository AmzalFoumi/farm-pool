import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

/* The delivery partner tabs. Jobs is the board and what they hold (FARM-49, FARM-54); Route is
   the day in the order they promised it (FARM-61); Profile holds the vehicle and its check
   (FARM-45). Jobs and Route are deliberately separate: one answers "what work is there", the
   other "what am I doing next", and the second is the one open while driving. Same NativeTabs
   mechanism as the other shells — platform symbol sets, theme colours. */
export default function DriverTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="driver-jobs">
        <NativeTabs.Trigger.Label>Jobs</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "box.truck", selected: "box.truck.fill" }}
          md="local_shipping"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="driver-route">
        <NativeTabs.Trigger.Label>Route</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="route" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="driver-profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
