/**
 * One offer, for either side: the terms on the table, whose turn it is, and the three answers —
 * counter, accept, decline. Once agreed it links to the order.
 */

import type { Offer, PublicUser, SavedLocation, SenderType } from "@farm-pool/shared";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { RequestView } from "@/components/app/request-view";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { listingsApi } from "@/features/listings/api";
import { NegotiateSheet } from "@/features/listings/components/negotiate-sheet";
import { NegotiationHistorySheet } from "@/features/listings/components/negotiation-history-sheet";
import { OfferCard } from "@/features/listings/components/offer-card";
import { AcceptOfferSheet } from "@/features/offers/accept-offer-sheet";
import { offersApi } from "@/features/offers/api";
import { offerErrorMessage } from "@/features/offers/error-message";
import { toUiOffer, viewerOf } from "@/features/offers/to-ui-offer";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function OfferScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const token = auth.token ?? "";

  const offer = useRequest(() => offersApi.one(token, id), `${token}|${id}`);

  // The other side may answer while this screen is open.
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(offer.silentRefresh, 10000);
      return () => clearInterval(timer);
    }, [offer.silentRefresh])
  );

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Offer" />
      <RequestView request={offer}>
        {(data) => (
          <OfferBody
            offer={data}
            viewer={viewerOf(data, auth.user?.id ?? "")}
            token={token}
            savedLocations={auth.user?.savedLocations ?? []}
            onUserChanged={auth.updateUser}
            onChanged={offer.reload}
            onOpenOrder={(orderId) =>
              router.replace({ pathname: "/orders/[id]", params: { id: orderId } })
            }
            bottomInset={insets.bottom}
          />
        )}
      </RequestView>
    </View>
  );
}

function OfferBody({
  offer,
  viewer,
  token,
  savedLocations,
  onUserChanged,
  onChanged,
  onOpenOrder,
  bottomInset
}: {
  offer: Offer;
  viewer: SenderType;
  token: string;
  savedLocations: readonly SavedLocation[];
  onUserChanged: (user: PublicUser) => void;
  onChanged: () => void;
  onOpenOrder: (orderId: string) => void;
  bottomInset: number;
}) {
  const [countering, setCountering] = useState(false);
  const [history, setHistory] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  /* The listing gives the counter sheet its bounds and the accept sheet its district. It can
     fail to load (a listing that sold out is no longer public); the screen still works then. */
  const listing = useRequest(
    () => listingsApi.get(token, offer.listingId),
    `${token}|${offer.listingId}`
  );
  const ui = toUiOffer(offer, viewer);

  const decline = () => {
    Alert.alert("Decline this offer?", "This cannot be undone.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, decline",
        style: "destructive",
        onPress: async () => {
          if (declining) return;
          setDeclining(true);
          try {
            await offersApi.decline(token, offer.id);
            onChanged();
          } catch (e) {
            Alert.alert("Could not decline", offerErrorMessage(e, "Please try again."));
          } finally {
            setDeclining(false);
          }
        }
      }
    ]);
  };

  return (
    <>
      <ScrollView
        contentContainerClassName="gap-4 p-gutter"
        contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
      >
        <OfferCard
          offer={ui}
          onNegotiate={() => setCountering(true)}
          onViewHistory={() => setHistory(true)}
          onAccept={() => setAccepting(true)}
          onDecline={decline}
        />

        {offer.orderId ? (
          <VStack className="gap-2">
            <Text className="type-caption text-muted-foreground">
              This offer was agreed and is now an order.
            </Text>
            <AppButton label="View the order" onPress={() => onOpenOrder(offer.orderId!)} />
          </VStack>
        ) : null}
      </ScrollView>

      <NegotiateSheet
        isOpen={countering}
        onClose={() => setCountering(false)}
        offer={ui}
        minKg={listing.data?.minOrderKg ?? 1}
        maxKg={listing.data?.quantityKg ?? offer.quantityKg}
        onSubmit={async (rate, quantity, note) => {
          try {
            await offersApi.negotiate(token, offer.id, {
              proposedPrice: rate,
              proposedQuantityKg: quantity,
              note: note || undefined
            });
            setCountering(false);
            onChanged();
          } catch (e) {
            // The sheet stays open so what was typed is not lost.
            Alert.alert("Could not send", offerErrorMessage(e, "Please try again."));
          }
        }}
      />

      <NegotiationHistorySheet
        isOpen={history}
        onClose={() => setHistory(false)}
        offer={offer}
        viewer={viewer}
      />

      <AcceptOfferSheet
        open={accepting}
        onClose={() => setAccepting(false)}
        offer={offer}
        viewer={viewer}
        district={listing.data?.district}
        token={token}
        savedLocations={savedLocations}
        onUserChanged={onUserChanged}
        onAccepted={onOpenOrder}
        bottomInset={bottomInset}
      />
    </>
  );
}
