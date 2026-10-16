import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

/* The five farmer tabs. Same NativeTabs mechanism as the buyer (`app-tabs.tsx`) and coordinator
   (`coordinator-tabs.tsx`) shells — platform symbol sets, theme colours, nothing here bypasses
   the design system. "Add" opens the create-listing wizard (see `(farmer)/(tabs)/add.tsx`). */
export default function FarmerTabs() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="farmer-home">
        <NativeTabs.Trigger.Label>{t("farmer.tabs.home")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="farmer-listings">
        <NativeTabs.Trigger.Label>{t("farmer.tabs.listings")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "leaf", selected: "leaf.fill" }} md="eco" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add">
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="farmer-orders">
        <NativeTabs.Trigger.Label>{t("farmer.tabs.orders")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "shippingbox", selected: "shippingbox.fill" }}
          md="inventory_2"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="farmer-profile">
        <NativeTabs.Trigger.Label>{t("farmer.tabs.profile")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
