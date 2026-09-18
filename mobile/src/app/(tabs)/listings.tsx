/**
 * Listings — the wholesale buyer's browse screen. Wireframe frames 2 and 3.
 *
 * Reads verified listings from the api (`GET /catalog/listings`). The search box filters the
 * loaded page on the device by crop name, farmer or district; server-side crop and district
 * filters exist and are wired the day the screen grows filter controls.
 */

import { cropById, type Listing } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon, SearchIcon, MenuIcon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { listingsApi } from "@/features/listings/api";
import { ListingGridCard, ListingListRow } from "@/features/listings/listing-card";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type ViewMode = "grid" | "list";

/** No grid glyph exists in either icon set, and pulling in an icon package for
 *  one square is poor value (`.plans/DECISIONS.md`, open question 3). Four
 *  boxes in a 2×2 is layout, not a redrawn glyph, so it stays inside rule 7. */
function GridGlyph({ className }: { className: string }) {
  return (
    <Box className="h-4 w-4 flex-row flex-wrap gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} className={`h-1.5 w-1.5 rounded-sm ${className}`} />
      ))}
    </Box>
  );
}

function matches(listing: Listing, needle: string) {
  const crop = cropById(listing.cropId).name.toLowerCase();
  return (
    crop.includes(needle) ||
    listing.farmerName.toLowerCase().includes(needle) ||
    listing.district.toLowerCase().includes(needle)
  );
}

export default function ListingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");

  const listings = useRequest(() => listingsApi.list(token ?? ""), token ?? "");
  const needle = query.trim().toLowerCase();

  return (
    <View className="flex-1 bg-background">
      {/* ── Green header ─────────────────────────────────────────────── */}
      <VStack
        className="gap-3 rounded-b-sheet bg-brand-deep px-gutter pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <HStack className="items-center justify-between">
          <Text className="type-title text-brand-deep-foreground">Listings</Text>

          {/* View toggle. Each half is 40dp tall to match the wireframe, and
              `hitSlop={4}` extends the touch area to the 48dp rule 4 requires. */}
          <HStack className="min-h-tap items-center rounded-chip bg-brand-deep-foreground/15 p-1">
            <Pressable
              onPress={() => setView("grid")}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: view === "grid" }}
              accessibilityLabel="Grid view"
              className={`h-10 w-12 items-center justify-center rounded-chip ${
                view === "grid" ? "bg-card" : ""
              }`}
            >
              <GridGlyph className={view === "grid" ? "bg-brand-deep" : "bg-brand-deep-muted"} />
            </Pressable>

            <Pressable
              onPress={() => setView("list")}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: view === "list" }}
              accessibilityLabel="List view"
              className={`h-10 w-12 items-center justify-center rounded-chip ${
                view === "list" ? "bg-card" : ""
              }`}
            >
              <Icon
                as={MenuIcon}
                className={view === "list" ? "text-brand-deep" : "text-brand-deep-muted"}
              />
            </Pressable>
          </HStack>
        </HStack>

        <Input className="h-tap rounded-field border-0 bg-card px-4">
          <InputSlot>
            <InputIcon as={SearchIcon} />
          </InputSlot>
          <InputField
            value={query}
            onChangeText={setQuery}
            placeholder="Search produce, farmer or district"
            returnKeyType="search"
            autoCorrect={false}
            className="type-body"
          />
        </Input>
      </VStack>

      <RequestView request={listings}>
        {(all) => {
          const results = needle ? all.filter((l) => matches(l, needle)) : all;
          return (
            /* `key={view}` is load-bearing: FlatList caches its layout and will
               not re-measure when `numColumns` changes. */
            <FlatList
              key={view}
              data={results}
              keyExtractor={(item) => item.id}
              numColumns={view === "grid" ? 2 : 1}
              columnWrapperClassName={view === "grid" ? "gap-3" : undefined}
              contentContainerClassName="gap-3 px-gutter pt-3"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              onRefresh={listings.reload}
              refreshing={false}
              renderItem={({ item }) => {
                const open = () =>
                  router.push({ pathname: "/listing/[id]", params: { id: item.id } });
                return view === "grid" ? (
                  <ListingGridCard listing={item} onPress={open} />
                ) : (
                  <ListingListRow listing={item} onPress={open} />
                );
              }}
              ListEmptyComponent={
                needle ? (
                  <EmptyNote title="No matches" note={`Nothing matches “${query.trim()}”.`} />
                ) : (
                  <EmptyNote
                    title="No listings yet"
                    note="Verified farmer listings will appear here."
                  />
                )
              }
            />
          );
        }}
      </RequestView>
    </View>
  );
}
