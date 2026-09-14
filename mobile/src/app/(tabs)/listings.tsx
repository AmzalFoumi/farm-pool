/**
 * Listings — the wholesale buyer's browse screen. Wireframe frames 2 and 3.
 *
 * Temporary: it renders the fixtures in `src/features/listings/fixtures.ts`,
 * not a backend. See that file for why.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon, SearchIcon, MenuIcon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { LISTINGS, type Listing } from "@/features/listings/fixtures";
import { ListingGridCard, ListingListRow } from "@/features/listings/listing-card";

type ViewMode = "grid" | "list";

/** Today / This week / Custom date, as the wireframe draws them.
 *
 *  Not selectable. The fixtures carry no dates, so there is nothing to filter
 *  on, and a chip that takes a tap and reports itself "selected" tells a screen
 *  reader a filter was applied when none was. The comment saying so lives here,
 *  where that user will never reach it — so the control does not make the claim
 *  in the first place. "Today" is shown as the current range because that is
 *  what the screen is in fact showing: everything.
 *
 *  Same treatment as the category chips on the home screen. Both become real
 *  controls the moment a listing carries a date and a category. */
const RANGES = [
  { label: "Today", current: true },
  { label: "This week", current: false },
  { label: "Custom date", current: false }
] as const;

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

export default function ListingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const results: Listing[] = needle
    ? LISTINGS.filter(
        (l) => l.crop.toLowerCase().includes(needle) || l.farmer.toLowerCase().includes(needle)
      )
    : [...LISTINGS];

  return (
    <View className="flex-1 bg-background">
      {/* ── Green header ─────────────────────────────────────────────── */}
      <VStack
        className="gap-3 rounded-b-sheet bg-brand-deep px-gutter pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <HStack className="items-center justify-between">
          <Text className="type-title text-brand-deep-foreground">Listings</Text>

          {/* View toggle. Each half is drawn 40dp tall to match the header the
              wireframe draws, and `hitSlop={4}` extends the touch area to the
              48dp rule 4 requires — 40 + 4 top + 4 bottom. Putting `min-h-tap`
              on the halves instead would satisfy the class name and push the
              whole control to 56dp; a parent's `min-h-tap` does not grow a
              child's hit area, which is what the first version of this got
              wrong. The rule is about the touch target, not the box. */}
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

        {/* gluestack's Input has no size or variant axis — its base is
            `min-h-9 rounded-md` — so the design system's field shape comes from
            these overrides rather than a prop. */}
        <Input className="h-tap rounded-field border-0 bg-card px-4">
          <InputSlot>
            <InputIcon as={SearchIcon} />
          </InputSlot>
          <InputField
            value={query}
            onChangeText={setQuery}
            placeholder="Search produce or farmer"
            returnKeyType="search"
            autoCorrect={false}
            className="type-body"
          />
        </Input>
      </VStack>

      {/* ── Date chips — labels, not controls. See RANGES above. ─────────── */}
      <HStack className="gap-2 px-gutter py-3">
        {RANGES.map(({ label, current }) => (
          <Box
            key={label}
            className={[
              "justify-center rounded-chip px-4 py-2.5",
              current ? "bg-brand-deep" : "border border-border bg-card"
            ].join(" ")}
          >
            <Text
              className={`type-body-sm-bold ${
                current ? "text-brand-deep-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </Text>
          </Box>
        ))}
      </HStack>

      {/* ── Results ──────────────────────────────────────────────────────
          `key={view}` is load-bearing: FlatList caches its layout and will not
          re-measure when `numColumns` changes, so without a remount the toggle
          silently does nothing. */}
      <FlatList
        key={view}
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={view === "grid" ? 2 : 1}
        columnWrapperClassName={view === "grid" ? "gap-3" : undefined}
        contentContainerClassName="gap-3 px-gutter"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => {
          const open = () => router.push({ pathname: "/listing/[id]", params: { id: item.id } });
          return view === "grid" ? (
            <ListingGridCard listing={item} onPress={open} />
          ) : (
            <ListingListRow listing={item} onPress={open} />
          );
        }}
        ListEmptyComponent={
          <Text className="type-body mt-8 text-center text-muted-foreground">
            No listings match “{query.trim()}”.
          </Text>
        }
      />
    </View>
  );
}
