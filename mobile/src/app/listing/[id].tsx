/**
 * Listing detail — wireframe frame 4.
 *
 * In the root stack, not in `(tabs)`: the wireframe draws no tab bar here, and it is a screen
 * you enter and leave rather than a destination you switch to.
 *
 * "Place order" opens a sheet with one quantity field and sends `POST /orders`. "Request call"
 * stays disabled: contacting the farmer is FARM-24, another developer's story.
 */

import { can, cropById, placeOrderSchema, type Listing } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { BackIcon } from "@/components/app/icons";
import { RequestView } from "@/components/app/request-view";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper
} from "@/components/ui/actionsheet";
import { HStack } from "@/components/ui/hstack";
import { Icon, PhoneIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { listingsApi } from "@/features/listings/api";
import { CropTile } from "@/features/listings/crop-tile";
import { ordersApi } from "@/features/orders/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const token = auth.token ?? "";

  const listing = useRequest(() => listingsApi.get(token, id), `${token}|${id}`);

  return (
    <View className="flex-1 bg-background">
      <RequestView request={listing}>
        {(data) => (
          <ListingBody
            listing={data}
            canOrder={auth.user ? can(auth.user.role, "order:place") : false}
            token={token}
            onBack={() => router.back()}
            onPlaced={(orderId) =>
              router.replace({ pathname: "/orders/[id]", params: { id: orderId } })
            }
            bottomInset={insets.bottom}
            topInset={insets.top}
          />
        )}
      </RequestView>
    </View>
  );
}

function ListingBody({
  listing,
  canOrder,
  token,
  onBack,
  onPlaced,
  topInset,
  bottomInset
}: {
  listing: Listing;
  canOrder: boolean;
  token: string;
  onBack: () => void;
  onPlaced: (orderId: string) => void;
  topInset: number;
  bottomInset: number;
}) {
  const crop = cropById(listing.cropId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows = [
    { label: "Unit price", value: `${formatPrice(listing.pricePerKg)} / kg` },
    { label: "Available", value: `${listing.quantityKg} kg` },
    { label: "Minimum order", value: `${listing.minOrderKg} kg` },
    { label: "Harvest date", value: formatDate(listing.harvestDate) }
  ];

  return (
    <>
      <HStack
        className="items-center gap-3 border-b border-border bg-card px-gutter pb-4"
        style={{ paddingTop: topInset + 16 }}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-tap w-tap items-center justify-center rounded-pill border border-border"
        >
          <BackIcon />
        </Pressable>
        <VStack className="flex-1">
          <Text className="type-title text-foreground" numberOfLines={1}>
            {crop.name}
          </Text>
          <Text className="type-caption text-muted-foreground" numberOfLines={1}>
            {listing.farmerName} · {listing.district}
          </Text>
        </VStack>
      </HStack>

      <ScrollView contentContainerClassName="gap-4 p-gutter">
        {/* No photos yet — the crop emoji stands in, as on the browse cards. */}
        <CropTile emoji={crop.emoji} size="lg" />

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
          <Text className="type-h4 text-foreground">{listing.farmerName}</Text>
          <Text className="type-caption text-muted-foreground">
            Pickup in {listing.district} district
          </Text>
        </VStack>
      </ScrollView>

      {/* Footer. `AppButton` is full-width with no size axis, so the pair mirrors
          its construction (`h-control rounded-field`). "Request call" is disabled
          and says so to a screen reader; it is FARM-24's to wire. */}
      <HStack
        className="gap-3 border-t border-border bg-card px-gutter pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 23) }}
      >
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`Request a call with ${listing.farmerName}`}
          className="h-control flex-1 flex-row items-center justify-center gap-2.5 rounded-field border border-brand-deep bg-card opacity-60"
        >
          <Icon as={PhoneIcon} className="text-brand-deep" />
          <Text className="type-h4 text-brand-deep">Request call</Text>
        </Pressable>

        {canOrder ? (
          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Place an order for this listing"
            className="h-control flex-1 flex-row items-center justify-center rounded-field bg-primary active:opacity-80"
          >
            <Text className="type-h4 text-primary-foreground">Place order</Text>
          </Pressable>
        ) : null}
      </HStack>

      <PlaceOrderSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        listing={listing}
        token={token}
        onPlaced={onPlaced}
        bottomInset={bottomInset}
      />
    </>
  );
}

/** One field: how many kilograms. Everything else comes from the listing on the server. */
function PlaceOrderSheet({
  open,
  onClose,
  listing,
  token,
  onPlaced,
  bottomInset
}: {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  token: string;
  onPlaced: (orderId: string) => void;
  bottomInset: number;
}) {
  const [quantity, setQuantity] = useState(String(listing.minOrderKg));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const kg = Number(quantity);
  const inRange = Number.isInteger(kg) && kg >= listing.minOrderKg && kg <= listing.quantityKg;
  const rangeHint = `Between ${listing.minOrderKg} kg and ${listing.quantityKg} kg`;

  const submit = async () => {
    setError(null);
    const parsed = placeOrderSchema.safeParse({ listingId: listing.id, quantityKg: kg });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a quantity");
      return;
    }
    if (!inRange) {
      setError(rangeHint);
      return;
    }
    setSubmitting(true);
    try {
      const order = await ordersApi.place(token, parsed.data);
      onClose();
      onPlaced(order.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not place the order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Actionsheet isOpen={open} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent
        className="rounded-t-sheet bg-card px-gutter"
        style={{ paddingBottom: Math.max(bottomInset, 16) }}
      >
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <VStack className="w-full gap-4 pt-2">
          <Text className="type-h3 text-foreground">Place order</Text>
          <AppTextField
            label="Quantity (kg)"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            error={error ?? undefined}
          />
          <HStack className="items-center justify-between">
            <Text className="type-caption text-muted-foreground">{rangeHint}</Text>
            <Text className="type-body-bold text-foreground">
              {inRange ? formatPrice(kg * listing.pricePerKg) : "—"}
            </Text>
          </HStack>
          <AppButton
            label={submitting ? "Sending…" : "Send request"}
            onPress={() => void submit()}
            disabled={submitting}
          />
          <Text className="type-caption text-center text-muted-foreground">
            {listing.farmerName} will accept or decline. Nothing is paid now.
          </Text>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
