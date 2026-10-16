import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps
} from "expo-router/ui";
import { Pressable, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { MaxContentWidth, Spacing } from "@/constants/theme";

/** Web fallback for the five farmer tabs — same structure as `app-tabs.web.tsx`. */
export default function FarmerTabs() {
  const { t } = useTranslation();
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="farmer-home" href="/farmer-home" asChild>
            <TabButton>{t("farmer.tabs.home")}</TabButton>
          </TabTrigger>
          <TabTrigger name="farmer-listings" href="/farmer-listings" asChild>
            <TabButton>{t("farmer.tabs.listings")}</TabButton>
          </TabTrigger>
          <TabTrigger name="add" href="/add" asChild>
            <TabButton>Add</TabButton>
          </TabTrigger>
          <TabTrigger name="farmer-orders" href="/farmer-orders" asChild>
            <TabButton>{t("farmer.tabs.orders")}</TabButton>
          </TabTrigger>
          <TabTrigger name="farmer-profile" href="/farmer-profile" asChild>
            <TabButton>{t("farmer.tabs.profile")}</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? "backgroundSelected" : "backgroundElement"}
        style={styles.tabButtonView}
      >
        <ThemedText type="small" themeColor={isFocused ? "text" : "textSecondary"}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { t } = useTranslation();
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          {t("brand.farmer")}
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row"
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth
  },
  brandText: {
    marginRight: "auto"
  },
  pressed: {
    opacity: 0.7
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three
  }
});
