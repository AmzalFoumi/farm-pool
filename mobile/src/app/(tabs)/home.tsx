/**
 * Buyer home — wireframe frame 1.
 *
 * Greets the signed-in user and offers the four things a buyer does: browse listings, see
 * their orders, see their offers, see their crop requests. Counts and "near you" wait for a
 * location and a dashboard endpoint; nothing here is invented.
 */

import { useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/providers/auth-provider";

/* Key paths, not resolved strings: a module-level `t()` runs before i18next has a language and
   the value would be captured once, so the cards would keep their first-render language. */
const CARDS: { titleKey: string; noteKey: string; href: Href }[] = [
  { titleKey: "buyer.home.browse", noteKey: "buyer.home.browseNote", href: "/listings" },
  { titleKey: "buyer.home.orders", noteKey: "buyer.home.ordersNote", href: "/orders" },
  { titleKey: "buyer.home.offers", noteKey: "buyer.home.offersNote", href: "/my-offers" },
  { titleKey: "buyer.home.requests", noteKey: "buyer.home.requestsNote", href: "/wanted" }
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const name = user?.displayName.trim() ?? "";

  return (
    <View className="flex-1 bg-background">
      <VStack
        className="rounded-b-sheet bg-brand-deep px-gutter pb-5"
        style={{ paddingTop: insets.top + 16 }}
      >
        <HStack className="items-center justify-between">
          <VStack className="gap-1">
            <Text className="type-h3 text-brand-deep-foreground">
              Hello{name ? `, ${name}` : ""}
            </Text>
            <Text className="type-caption text-brand-deep-muted">{t("buyer.home.role")}</Text>
          </VStack>
          <Box className="h-11 w-11 items-center justify-center rounded-pill bg-card">
            <Text className="type-h4 text-brand-deep">{name.charAt(0).toUpperCase() || "?"}</Text>
          </Box>
        </HStack>
      </VStack>

      <ScrollView contentContainerClassName="gap-3 p-gutter">
        {CARDS.map(({ titleKey, noteKey, href }) => (
          <Pressable
            key={titleKey}
            onPress={() => router.push(href)}
            accessibilityRole="button"
            accessibilityLabel={t(titleKey)}
            className="elevation-card min-h-tap justify-center rounded-card border border-border bg-card p-4 active:opacity-80"
          >
            <Text className="type-h4 text-foreground">{t(titleKey)}</Text>
            <Text className="type-caption mt-1 text-muted-foreground">{t(noteKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
