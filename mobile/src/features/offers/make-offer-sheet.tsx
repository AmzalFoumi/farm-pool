import {
  createOfferSchema,
  type DropOff,
  type Listing,
  type PublicUser,
  type SavedLocation
} from "@farm-pool/shared";
import { useState } from "react";
import { Dimensions, ScrollView } from "react-native";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper
} from "@/components/ui/actionsheet";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DeliveryLocationField } from "@/features/geo/delivery-location-field";
import { offersApi } from "@/features/offers/api";
import { offerErrorMessage } from "@/features/offers/error-message";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/**
 * A buyer proposing their own price and quantity on a negotiable listing (FARM-46).
 *
 * The session arrives as props, not from `useAuth`: an Actionsheet mounts through a portal,
 * outside the subtree under `AuthProvider`. Same reason as the Place order sheet.
 */
export function MakeOfferSheet({
  open,
  onClose,
  listing,
  token,
  savedLocations,
  onUserChanged,
  onMade,
  bottomInset
}: {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  token: string;
  savedLocations: readonly SavedLocation[];
  onUserChanged: (user: PublicUser) => void;
  /** Called with the offer to open: the new one, or the one the buyer already had here. */
  onMade: (offerId: string) => void;
  bottomInset: number;
}) {
  const [price, setPrice] = useState(String(listing.pricePerKg));
  const [quantity, setQuantity] = useState(String(listing.minOrderKg));
  const [note, setNote] = useState("");
  const [dropOff, setDropOff] = useState<DropOff | undefined>();
  const [priceError, setPriceError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rupees = Number(price);
  const kg = Number(quantity);
  const rangeHint = `Between ${listing.minOrderKg} kg and ${listing.quantityKg} kg`;
  const inRange = Number.isInteger(kg) && kg >= listing.minOrderKg && kg <= listing.quantityKg;

  const submit = async () => {
    setPriceError(null);
    setQuantityError(null);
    setError(null);

    const parsed = createOfferSchema.safeParse({
      listingId: listing.id,
      listingType: "STANDARD",
      proposedPrice: rupees,
      proposedQuantityKg: kg,
      ...(note.trim() ? { note } : {}),
      ...(dropOff ? { dropOff } : {})
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "proposedPrice") setPriceError(issue.message);
        else if (issue.path[0] === "proposedQuantityKg") setQuantityError(issue.message);
        else setError(issue.message);
      }
      return;
    }
    if (!inRange) {
      setQuantityError(rangeHint);
      return;
    }

    setSubmitting(true);
    try {
      const offer = await offersApi.create(token, parsed.data);
      onClose();
      onMade(offer.id);
    } catch (e) {
      if (e instanceof ApiError && e.code === "offer_exists") {
        // They already have a live offer on this listing: take them to it rather than refuse.
        const existing = (await offersApi.mine(token).catch(() => [])).find(
          (o) =>
            o.listingId === listing.id &&
            !o.wantedId &&
            (o.status === "PENDING" || o.status === "NEGOTIATING")
        );
        if (existing) {
          onClose();
          onMade(existing.id);
          return;
        }
      }
      if (e instanceof ApiError && e.code === "quantity_out_of_range") setQuantityError(e.message);
      else setError(offerErrorMessage(e, "Could not send the offer"));
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
        <ScrollView
          className="w-full"
          style={{ maxHeight: Dimensions.get("window").height * 0.8 }}
          contentContainerClassName="pb-2"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <VStack className="w-full gap-4 pt-2">
            <VStack className="gap-1">
              <Text className="type-h3 text-foreground">Make an offer</Text>
              <Text className="type-caption text-muted-foreground">
                {listing.farmerName} is asking {formatPrice(listing.pricePerKg)} per kg.
              </Text>
            </VStack>

            <AppTextField
              testID="offer-price"
              label="Your price per kg (Rs.)"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              error={priceError ?? undefined}
            />
            <AppTextField
              testID="offer-quantity"
              label="Quantity (kg)"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              error={quantityError ?? undefined}
            />
            <HStack className="items-center justify-between">
              <Text className="type-caption text-muted-foreground">{rangeHint}</Text>
              <Text className="type-body-bold text-foreground">
                {inRange && rupees > 0 ? formatPrice(kg * rupees) : "—"}
              </Text>
            </HStack>

            <AppTextField
              testID="offer-note"
              label="Note to the farmer (optional)"
              value={note}
              onChangeText={setNote}
            />

            <DeliveryLocationField
              district={listing.district}
              value={dropOff}
              onChange={setDropOff}
              token={token}
              savedLocations={savedLocations}
              onUserChanged={onUserChanged}
            />

            {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

            <AppButton
              testID="offer-send"
              label={submitting ? "Sending…" : "Send offer"}
              onPress={() => void submit()}
              disabled={submitting}
            />
            <Text className="type-caption text-center text-muted-foreground">
              {listing.farmerName} can accept, decline or name another price. Nothing is paid now.
            </Text>
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
