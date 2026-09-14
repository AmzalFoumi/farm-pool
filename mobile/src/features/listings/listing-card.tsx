import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { CropTile } from "./crop-tile";
import { formatPrice, type Listing } from "./fixtures";

/* Two shapes for the same row, because the browse screen toggles between a
   grid and a list. Both are built from `Pressable` + stacks rather than
   gluestack's `Card`, which bakes in `rounded-xl` instead of the design
   system's `rounded-card` — the same reason `app-button.tsx` does not use
   gluestack's `Button`.

   Neither navigates yet. `onPress` is wired in the next gate, when the detail
   screen exists; the accessibility labels are written now so the tap target is
   correct from the start. */

const CARD = "elevation-card rounded-card border border-border bg-card";

function label(listing: Listing) {
  return `${listing.crop}, ${formatPrice(listing.pricePerKg)} per kilo, from ${listing.farmer} in ${listing.place}`;
}

export function ListingGridCard({ listing, onPress }: { listing: Listing; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label(listing)}
      className={`min-h-tap flex-1 gap-2 p-3 ${CARD}`}
    >
      <CropTile emoji={listing.emoji} size="lg" />
      <VStack className="gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {listing.crop}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {listing.farmer}
        </Text>
        <Text className="type-caption-bold text-primary">
          {formatPrice(listing.pricePerKg)}/kg · {listing.quantityKg} kg
        </Text>
      </VStack>
    </Pressable>
  );
}

export function ListingListRow({ listing, onPress }: { listing: Listing; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label(listing)}
      className={`min-h-tap flex-row items-center gap-3 p-3 ${CARD}`}
    >
      <CropTile emoji={listing.emoji} />
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {listing.crop}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {listing.farmer} · {listing.place} · {listing.distanceKm} km
        </Text>
      </VStack>
      <VStack className="items-end gap-0.5">
        <Text className="type-body-bold text-primary">{formatPrice(listing.pricePerKg)}</Text>
        <Text className="type-body-sm text-muted-foreground">{listing.quantityKg} kg</Text>
      </VStack>
    </Pressable>
  );
}
