/**
 * Buyer home — wireframe frame 1. Replaces the stock Expo template screen.
 *
 * Every number on it is static: there are no orders, no saved farmers and no
 * "near you" until there is a backend. The greeting is fixed copy rather than
 * time-aware, exactly as the wireframe draws it.
 */

import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

const STATS = [
  { label: "Active orders", value: "3" },
  { label: "Saved farmers", value: "12" }
] as const;

/* Chips only. Category filtering needs a category on the listing, which the
   fixtures do not carry and the wireframe does not show — so these select
   nothing rather than inventing a field. Same reasoning as the date chips on
   the listings screen. */
const CATEGORIES = ["Vegetables", "Fruits", "Grains", "Spices"] as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <VStack
        className="rounded-b-sheet bg-brand-deep px-gutter pb-5"
        style={{ paddingTop: insets.top + 16 }}
      >
        <HStack className="items-center justify-between">
          <VStack className="gap-1">
            <Text className="type-h3 text-brand-deep-foreground">Good morning</Text>
            <Text className="type-caption text-brand-deep-muted">Dambulla Traders</Text>
          </VStack>
          <Box className="h-11 w-11 items-center justify-center rounded-pill bg-card">
            <Text className="type-h4 text-brand-deep">D</Text>
          </Box>
        </HStack>
      </VStack>

      <ScrollView contentContainerClassName="gap-4 p-gutter">
        <HStack className="gap-3">
          {STATS.map(({ label, value }) => (
            <VStack
              key={label}
              className="elevation-card flex-1 gap-1 rounded-card border border-border bg-card p-4"
            >
              <Text className="type-caption text-muted-foreground">{label}</Text>
              <Text className="type-h1 text-foreground">{value}</Text>
            </VStack>
          ))}
        </HStack>

        <Box className="rounded-card bg-secondary px-4 py-3">
          <Text className="type-body text-secondary-foreground">3 new listings today near you</Text>
        </Box>

        <VStack className="gap-2">
          <Text className="type-body-bold text-foreground">Browse by category</Text>
          <HStack className="flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Box key={category} className="rounded-chip border border-border bg-card px-4 py-2.5">
                <Text className="type-body-sm-bold text-muted-foreground">{category}</Text>
              </Box>
            ))}
          </HStack>
        </VStack>

        <Pressable
          onPress={() => router.push("/listings")}
          accessibilityRole="button"
          accessibilityLabel="Browse today's listings"
          className="elevation-card min-h-tap justify-center rounded-card border border-border bg-card p-4 active:opacity-80"
        >
          <Text className="type-h4 text-foreground">Browse today’s listings</Text>
          <Text className="type-caption mt-1 text-muted-foreground">
            Six farmers posting within 50 km
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
