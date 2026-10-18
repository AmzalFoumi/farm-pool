import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

/* The delivery partner tabs. Route is the day in the order they promised it (FARM-61); Jobs is
   the board and what they hold (FARM-49, FARM-54); Profile holds the vehicle and its check
   (FARM-45). Jobs and Route are deliberately separate: one answers "what work is there", the
   other "what am I doing next". Route comes first because the second question is the one open
   while driving, and a driver who opens the app mid-run should already be looking at it. Same
   NativeTabs mechanism as the other shells — platform symbol sets, theme colours. */
export default function DriverTabs() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="driver-route">
        <NativeTabs.Trigger.Label>{t("route.title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="route" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="driver-jobs">
        <NativeTabs.Trigger.Label>{t("jobs.title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "box.truck", selected: "box.truck.fill" }}
          md="local_shipping"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="driver-profile">
        <NativeTabs.Trigger.Label>{t("profile.title")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
