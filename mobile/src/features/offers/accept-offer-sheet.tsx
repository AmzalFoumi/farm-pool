import type { DropOff, Offer, PublicUser, SavedLocation, SenderType } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Dimensions, ScrollView } from "react-native";

import { AppButton } from "@/components/app/app-button";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper
} from "@/components/ui/actionsheet";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { DeliveryLocationField } from "@/features/geo/delivery-location-field";
import { offersApi } from "@/features/offers/api";
import { offerErrorMessage } from "@/features/offers/error-message";
import { formatPrice } from "@/lib/format";

/**
 * Confirm accepting an offer. For the buyer it is also the last chance to say where the load
 * goes, if no delivery point was set earlier. Session data arrives as props (portal; see
 * `make-offer-sheet.tsx`).
 */
export function AcceptOfferSheet({
  open,
  onClose,
  offer,
  viewer,
  district,
  token,
  savedLocations,
  onUserChanged,
  onAccepted,
  bottomInset
}: {
  open: boolean;
  onClose: () => void;
  offer: Offer;
  viewer: SenderType;
  /** The listing's district, to centre a new pin. Absent when the listing could not be loaded,
   *  in which case the delivery field is not shown and the driver falls back to the district. */
  district?: string;
  token: string;
  savedLocations: readonly SavedLocation[];
  onUserChanged: (user: PublicUser) => void;
  onAccepted: (orderId: string) => void;
  bottomInset: number;
}) {
  const { t } = useTranslation();
  const [dropOff, setDropOff] = useState<DropOff | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const askForPlace = viewer === "BUYER" && !offer.dropOff && district !== undefined;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { orderId } = await offersApi.accept(token, offer.id, dropOff ? { dropOff } : {});
      onClose();
      onAccepted(orderId);
    } catch (e) {
      setError(offerErrorMessage(e, "Could not accept the offer"));
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
              <Text className="type-h3 text-foreground">Accept this offer?</Text>
              <Text className="type-body text-muted-foreground">
                {t(cropLabelKey(offer.cropId))} · {offer.quantityKg} kg at{" "}
                {formatPrice(offer.pricePerKg)} per kg — {formatPrice(offer.total)} in all.
              </Text>
              <Text className="type-caption text-muted-foreground">
                {viewer === "BUYER"
                  ? "This creates the order. You pay from the order screen."
                  : "This creates the order and takes the quantity off your listing."}
              </Text>
            </VStack>

            {askForPlace ? (
              <DeliveryLocationField
                district={district}
                value={dropOff}
                onChange={setDropOff}
                token={token}
                savedLocations={savedLocations}
                onUserChanged={onUserChanged}
              />
            ) : null}

            {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

            <AppButton
              testID="offer-accept-confirm"
              label={submitting ? "Accepting…" : "Accept offer"}
              onPress={() => void submit()}
              disabled={submitting}
            />
            <AppButton label="Not now" variant="outline" onPress={onClose} disabled={submitting} />
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
