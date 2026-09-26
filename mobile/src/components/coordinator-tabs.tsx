import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

/* The coordinator tabs (Figma section "coordinator", node 226:2, plus Benchmark for FARM-37 —
   not in that Figma section, added because setting prices is a daily, standing responsibility
   rather than an occasional detour through Region; the buyer shell already runs at five, which
   is Android's practical ceiling for a native tab bar, so this stays within precedent). Same
   NativeTabs mechanism as the buyer shell (`app-tabs.tsx`) — platform symbol sets, no PNG
   triples, nothing here bypasses the design system. See `.plans/DECISIONS.md`, open question 1
   for the same iconography caveat that already applies to the buyer tabs. */
export default function CoordinatorTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="region">
        <NativeTabs.Trigger.Label>Region</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "mappin", selected: "mappin.circle.fill" }}
          md="location_on"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="farmers">
        <NativeTabs.Trigger.Label>Farmers</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          md="group"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="batches">
        <NativeTabs.Trigger.Label>Batches</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="disputes">
        <NativeTabs.Trigger.Label>Disputes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="exclamationmark.triangle" md="warning" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="benchmark">
        <NativeTabs.Trigger.Label>Prices</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
