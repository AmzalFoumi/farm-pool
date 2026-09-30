import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

/* The delivery partner tabs (FARM-45). Two for now: Jobs, which the job-board stories fill
   (FARM-49, FARM-54), and Profile, where the vehicle and its verification live. Same NativeTabs
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

      <NativeTabs.Trigger name="driver-profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
