import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

/* The five buyer tabs from the wireframe. Android caps the native tab bar at
   five, so this is at the limit — a sixth destination has to go somewhere else
   (a "More" screen, or the tab bar moves off NativeTabs entirely).

   Icons are platform symbol sets rather than image assets: `sf` is an SF Symbol
   on iOS, `md` a Material Symbol on Android. Both ship with the OS, so no PNG
   triples are needed and nothing here touches the FarmPool design system. When
   branded icons are exported from Figma, each `sf`/`md` pair becomes one
   `src={require(...)}`. See `.plans/DECISIONS.md`, open question 1. */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      {/* `home`, not `index`: the root `index` route is now the welcome screen,
          so the tab shell's first screen is `(tabs)/home.tsx`. */}
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="listings">
        <NativeTabs.Trigger.Label>Listings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="map" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calls">
        <NativeTabs.Trigger.Label>Calls</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "phone", selected: "phone.fill" }} md="call" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
