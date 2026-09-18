import { cropById, type Listing } from "@farm-pool/shared";

import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatPrice } from "@/lib/format";

import { CropTile } from "./crop-tile";

/* Two shapes for the same row, because the browse screen toggles between a
   grid and a list. Both are built from `Pressable` + stacks rather than
   gluestack's `Card`, which bakes in `rounded-xl` instead of the design
   system's `rounded-card` — the same reason `app-button.tsx` does not use
   gluestack's `Button`. */

const CARD = "elevation-card rounded-card border border-border bg-card";

function label(listing: Listing) {
  const crop = cropById(listing.cropId);
  return `${crop.name}, ${formatPrice(listing.pricePerKg)} per kilo, from ${listing.farmerName} in ${listing.district}`;
}

export function ListingGridCard({ listing, onPress }: { listing: Listing; onPress?: () => void }) {
  const crop = cropById(listing.cropId);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label(listing)}
      className={`min-h-tap flex-1 gap-2 p-3 ${CARD}`}
    >
      <CropTile emoji={crop.emoji} size="lg" />
      <VStack className="gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {crop.name}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {listing.farmerName}
        </Text>
        <Text className="type-caption-bold text-primary">
          {formatPrice(listing.pricePerKg)}/kg · {listing.quantityKg} kg
        </Text>
      </VStack>
    </Pressable>
  );
}

export function ListingListRow({ listing, onPress }: { listing: Listing; onPress?: () => void }) {
  const crop = cropById(listing.cropId);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label(listing)}
      className={`min-h-tap flex-row items-center gap-3 p-3 ${CARD}`}
    >
      <CropTile emoji={crop.emoji} />
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {crop.name}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {listing.farmerName} · {listing.district}
        </Text>
      </VStack>
      <VStack className="items-end gap-0.5">
        <Text className="type-body-bold text-primary">{formatPrice(listing.pricePerKg)}</Text>
        <Text className="type-body-sm text-muted-foreground">{listing.quantityKg} kg</Text>
      </VStack>
    </Pressable>
  );
}
