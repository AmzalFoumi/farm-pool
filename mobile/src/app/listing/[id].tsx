/**
 * Listing detail — wireframe frame 4.
 *
 * In the root stack, not in `(tabs)`: the wireframe draws no tab bar here, and it is a screen
 * you enter and leave rather than a destination you switch to.
 *
 * The optional produce details a farmer enters in the listing wizard (variety, grade, packaging,
 * photos, fulfilment…) each show only when set (FARM-60); seeded listings have none of them.
 * `address` is deliberately not shown — it is the farm's pickup address, not browse information.
 *
 * "Place order" opens a sheet with one quantity field and sends `POST /orders`. "Request call"
 * stays disabled: contacting the farmer is FARM-24, another developer's story.
 */

import {
  can,
  cropById,
  placeOrderSchema,
  type FulfillmentOption,
  type DropOff,
  type Listing,
  type ListingPackaging,
  type PublicUser,
  type SavedLocation
} from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, ScrollView, View } from "react-native";
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
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon, PhoneIcon } from "@/components/ui/icon";
import { Image } from "@/components/ui/image";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { callsApi } from "@/features/calls/api";
import { listingsApi } from "@/features/listings/api";
import { CropTile } from "@/features/listings/crop-tile";
import { DeliveryLocationField } from "@/features/geo/delivery-location-field";
import { ordersApi } from "@/features/orders/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

/* Short buyer-facing names. The wizard's own labels are longer ("Reusable Plastic Crates
   (Standard 25kg)") and live inside its step components, so they are not importable. */
const PACKAGING_LABELS: Record<ListingPackaging, string> = {
  "plastic-crate": "Plastic crates",
  "wooden-box": "Wooden boxes",
  cardboard: "Cardboard cartons",
  "mesh-bag": "Mesh bags"
};

/* Same wording as the wizard's review step. */
const FULFILLMENT_LABELS: Record<FulfillmentOption, string> = {
  shared: "Shared transport",
  solo: "Solo transport"
};

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
            canCall={auth.user ? can(auth.user.role, "call:request") : false}
            onCallRequested={() => router.push("/calls")}
            token={token}
            savedLocations={auth.user?.savedLocations ?? []}
            onUserChanged={auth.updateUser}
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
  canCall,
  onCallRequested,
  token,
  savedLocations,
  onUserChanged,
  onBack,
  onPlaced,
  topInset,
  bottomInset
}: {
  listing: Listing;
  canOrder: boolean;
  canCall: boolean;
  /** After a call request is sent (or one was already open): go to the Calls tab. */
  onCallRequested: () => void;
  token: string;
  /* Threaded down rather than read from context: the Place order sheet renders through a portal,
     outside the AuthProvider subtree, so `useAuth()` throws in anything it contains. */
  savedLocations: readonly SavedLocation[];
  onUserChanged: (user: PublicUser) => void;
  onBack: () => void;
  onPlaced: (orderId: string) => void;
  topInset: number;
  bottomInset: number;
}) {
  const crop = cropById(listing.cropId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // FARM-24: ask the farmer for a video call. A repeat tap finds the open request instead.
  const requestCall = async () => {
    setCalling(true);
    setCallError(null);
    try {
      await callsApi.request(token, { listingId: listing.id });
      onCallRequested();
    } catch (e) {
      if (e instanceof ApiError && e.code === "call_already_open") onCallRequested();
      else setCallError(e instanceof ApiError ? e.message : "Could not request a call");
    } finally {
      setCalling(false);
    }
  };

  const rows = [
    { label: "Unit price", value: `${formatPrice(listing.pricePerKg)} / kg` },
    { label: "Available", value: `${listing.quantityKg} kg` },
    { label: "Minimum order", value: `${listing.minOrderKg} kg` },
    { label: "Harvest date", value: formatDate(listing.harvestDate) }
  ];

  const details = [
    listing.variety ? { label: "Variety", value: listing.variety } : null,
    listing.grade ? { label: "Grade", value: `Grade ${listing.grade}` } : null,
    listing.packaging ? { label: "Packaging", value: PACKAGING_LABELS[listing.packaging] } : null,
    listing.certifications?.length
      ? { label: "Certifications", value: listing.certifications.join(", ") }
      : null
  ].filter((row) => row !== null);

  const photos = listing.photos ?? [];
  const place = listing.town ? `${listing.town}, ${listing.district}` : listing.district;

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
            {listing.farmerName} · {place}
          </Text>
        </VStack>
      </HStack>

      <ScrollView contentContainerClassName="gap-4 p-gutter">
        {/* The farmer's photos when there are any; otherwise the crop emoji stands in, as on
            the browse cards. */}
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3"
          >
            {photos.map((uri, i) => (
              <Image
                key={uri}
                source={{ uri }}
                size="2xl"
                className="rounded-card bg-muted"
                alt={`${crop.name} photo ${i + 1}`}
              />
            ))}
          </ScrollView>
        ) : (
          <CropTile emoji={crop.emoji} size="lg" />
        )}

        {listing.acceptNegotiation ? (
          <Box className="self-start rounded-pill bg-info-subtle px-3 py-1">
            <Text className="type-body-sm-bold text-info">Price negotiable</Text>
          </Box>
        ) : null}

        <DetailCard title="Quantity & price" rows={rows} />

        {details.length > 0 ? <DetailCard title="Produce details" rows={details} /> : null}

        <VStack className="gap-1 rounded-card border border-border bg-card p-4">
          <Text className="type-h4 text-foreground">{listing.farmerName}</Text>
          <Text className="type-caption text-muted-foreground">Pickup in {place} district</Text>
          {listing.fulfillmentOption ? (
            <Text className="type-caption text-muted-foreground">
              {FULFILLMENT_LABELS[listing.fulfillmentOption]}
            </Text>
          ) : null}
          {listing.farmgateNotes ? (
            <Text className="type-body pt-2 text-foreground">{listing.farmgateNotes}</Text>
          ) : null}
        </VStack>
      </ScrollView>

      {callError ? (
        <Text className="type-caption bg-card px-gutter pt-3 text-destructive">{callError}</Text>
      ) : null}

      {/* Footer. `AppButton` is full-width with no size axis, so the pair mirrors
          its construction (`h-control rounded-field`). "Request call" is for buyers
          (FARM-24); for anyone else it stays visible but disabled. */}
      <HStack
        className="gap-3 border-t border-border bg-card px-gutter pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 23) }}
      >
        <Pressable
          onPress={() => void requestCall()}
          disabled={!canCall || calling}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCall || calling }}
          accessibilityLabel={`Request a video call with ${listing.farmerName}`}
          className={`h-control flex-1 flex-row items-center justify-center gap-2.5 rounded-field border border-brand-deep bg-card active:opacity-80 ${
            !canCall || calling ? "opacity-60" : ""
          }`}
        >
          <Icon as={PhoneIcon} className="text-brand-deep" />
          <Text className="type-h4 text-brand-deep">
            {calling ? "Requesting…" : "Request call"}
          </Text>
        </Pressable>

        {canOrder ? (
          <Pressable
            testID="open-place-order"
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
        savedLocations={savedLocations}
        onUserChanged={onUserChanged}
        onPlaced={onPlaced}
        bottomInset={bottomInset}
      />
    </>
  );
}

/** A titled card of label / value rows, divided by hairlines. */
function DetailCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <VStack className="gap-3 rounded-card border border-border bg-card p-4">
      <Text className="type-h4 text-foreground">{title}</Text>
      {rows.map(({ label, value }, i) => (
        <HStack
          key={label}
          className={`items-center justify-between gap-3 ${i > 0 ? "border-t border-border pt-3" : ""}`}
        >
          <Text className="type-body text-muted-foreground">{label}</Text>
          <Text className="type-body-bold shrink text-right text-foreground">{value}</Text>
        </HStack>
      ))}
    </VStack>
  );
}

/** One field: how many kilograms. Everything else comes from the listing on the server. */
function PlaceOrderSheet({
  open,
  onClose,
  listing,
  token,
  savedLocations,
  onUserChanged,
  onPlaced,
  bottomInset
}: {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  token: string;
  savedLocations: readonly SavedLocation[];
  onUserChanged: (user: PublicUser) => void;
  onPlaced: (orderId: string) => void;
  bottomInset: number;
}) {
  const [quantity, setQuantity] = useState(String(listing.minOrderKg));
  const [dropOff, setDropOff] = useState<DropOff | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const kg = Number(quantity);
  const inRange = Number.isInteger(kg) && kg >= listing.minOrderKg && kg <= listing.quantityKg;
  const rangeHint = `Between ${listing.minOrderKg} kg and ${listing.quantityKg} kg`;

  const submit = async () => {
    setError(null);
    const parsed = placeOrderSchema.safeParse({
      listingId: listing.id,
      quantityKg: kg,
      /* Omitted entirely when the buyer did not set one — an absent key is what "no delivery
         point" means on the api, and the driver falls back to the district. */
      ...(dropOff ? { dropOff } : {})
    });
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
        {/* Scrollable, because the sheet is no longer a fixed height: opening the delivery-point
            map pushes Send past the bottom of the screen, and an unreachable submit button is a
            buyer who pinned a location and then could not order. Capped at 80% of the window so
            the backdrop stays tappable to dismiss. */}
        <ScrollView
          className="w-full"
          style={{ maxHeight: Dimensions.get("window").height * 0.8 }}
          contentContainerClassName="pb-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="w-full gap-4 pt-2">
            <Text className="type-h3 text-foreground">Place order</Text>
            <AppTextField
              testID="order-quantity"
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

            {/* Centred on the listing's district so a new pin opens near the farm, which is the
              likeliest neighbourhood for a first drag. */}
            <DeliveryLocationField
              district={listing.district}
              value={dropOff}
              onChange={setDropOff}
              token={token}
              savedLocations={savedLocations}
              onUserChanged={onUserChanged}
            />
            <AppButton
              testID="order-send"
              label={submitting ? "Sending…" : "Send request"}
              onPress={() => void submit()}
              disabled={submitting}
            />
            <Text className="type-caption text-center text-muted-foreground">
              {listing.farmerName} will accept or decline. Nothing is paid now.
            </Text>
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
