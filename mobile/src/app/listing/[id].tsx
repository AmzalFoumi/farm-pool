/**
 * Listing detail — wireframe frame 4.
 *
 * In the root stack, not in `(tabs)`: the wireframe draws no tab bar here, and
 * it is a screen you enter and leave rather than a destination you switch to.
 *
 * Temporary, like the rest of the buyer path — it reads the fixtures. Neither
 * footer button does anything yet; calls and pickup booking are out of scope
 * while persistence is still an open decision.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { CalendarDaysIcon, Icon, PhoneIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { formatPrice, LISTINGS } from "@/features/listings/fixtures";

/** The minimum a buyer can take, as a share of what is on offer. A real listing
 *  will carry this as a field; until then it is derived so the row is not a
 *  fabricated number that contradicts the quantity above it. */
const MINIMUM_SHARE = 0.25;

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const listing = LISTINGS.find((l) => l.id === id);

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-gutter">
        <Text className="type-h3 text-foreground">Listing not found</Text>
        <Text className="type-body mt-2 text-center text-muted-foreground">
          It may have been sold or withdrawn.
        </Text>
      </View>
    );
  }

  const minimumKg = Math.round(listing.quantityKg * MINIMUM_SHARE);
  const rows = [
    { label: "Unit price", value: `${formatPrice(listing.pricePerKg)} / kg` },
    { label: "Available", value: `${listing.quantityKg} kg` },
    { label: "Minimum order", value: `${minimumKg} kg` },
    { label: "Est. total", value: formatPrice(listing.pricePerKg * minimumKg) }
  ];

  return (
    <View className="flex-1 bg-background">
      {/* ── App bar — same construction as sign-up-as.tsx ─────────────── */}
      <HStack
        className="items-center gap-3 border-b border-border bg-card px-gutter pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-tap w-tap items-center justify-center rounded-pill border border-border"
        >
          <BackIcon />
        </Pressable>
        <VStack className="flex-1">
          <Text className="type-title text-foreground" numberOfLines={1}>
            {listing.crop}
          </Text>
          <Text className="type-caption text-muted-foreground" numberOfLines={1}>
            {listing.farmer} · {listing.place}
          </Text>
        </VStack>
      </HStack>

      <ScrollView contentContainerClassName="gap-4 p-gutter">
        {/* Photo. There are no photos — the tile carries the crop's emoji, the
            same stand-in the browse cards use, at full width. */}
        <CropTile emoji={listing.emoji} size="lg" />

        <VStack className="gap-3 rounded-card border border-border bg-card p-4">
          <Text className="type-h4 text-foreground">Quantity & price</Text>
          {rows.map(({ label, value }, i) => (
            <HStack
              key={label}
              className={`items-center justify-between ${i > 0 ? "border-t border-border pt-3" : ""}`}
            >
              <Text className="type-body text-muted-foreground">{label}</Text>
              <Text className="type-body-bold text-foreground">{value}</Text>
            </HStack>
          ))}
        </VStack>

        <VStack className="gap-1 rounded-card border border-border bg-card p-4">
          <Text className="type-h4 text-foreground">{listing.farmer}</Text>
          <Text className="type-caption text-muted-foreground">
            {listing.place} · {listing.distanceKm} km away · Member since {listing.memberSince}
          </Text>
        </VStack>
      </ScrollView>

      {/* ── Footer ───────────────────────────────────────────────────────
          `AppButton` is hard-wired `w-full` with no size axis, so a side-by-side
          pair cannot use it. These mirror its construction exactly — `h-control
          rounded-field`, same pressed-opacity treatment — so the two stay
          visually identical if either changes.

          "Book pickup" is orange in the wireframe, and `bg-harvest-500` is a raw
          ramp, which rule 2 discourages. There is no semantic token for a
          secondary commitment action, and `warning` already means "pending" on
          the order lifecycle (rule 5), so reusing it here would say the wrong
          thing. It goes in as the wireframe draws it; the gap is one to raise
          with whoever owns the design system, not to close from a screen. */}
      <HStack
        className="gap-3 border-t border-border bg-card px-gutter pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Request a call with ${listing.farmer}`}
          className="h-control flex-1 flex-row items-center justify-center gap-2.5 rounded-field border border-brand-deep bg-card active:opacity-80"
        >
          <Icon as={PhoneIcon} className="text-brand-deep" />
          <Text className="type-h4 text-brand-deep">Request call</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Book a pickup for this listing"
          className="h-control flex-1 flex-row items-center justify-center gap-2.5 rounded-field bg-harvest-500 active:opacity-80"
        >
          <Icon as={CalendarDaysIcon} className="text-primary-foreground" />
          <Text className="type-h4 text-primary-foreground">Book pickup</Text>
        </Pressable>
      </HStack>
    </View>
  );
}
