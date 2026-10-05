import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cropById } from "@farm-pool/shared";

import { useAuth } from "@/providers/auth-provider";
import { useRequest } from "@/lib/use-request";
import { listingsApi } from "@/features/listings/api";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import {
  type Offer as UiOffer,
  OfferCard,
  type OfferStatus
} from "@/features/listings/components/offer-card";
import { NegotiateSheet } from "@/features/listings/components/negotiate-sheet";
import { NegotiationHistorySheet } from "@/features/listings/components/negotiation-history-sheet";
import { BackIcon } from "@/components/app/icons";
import { offersApi } from "@/features/offers/api";
import { Offer as SharedOffer } from "@farm-pool/shared";

function mapOfferToUI(offer: SharedOffer): UiOffer {
  let status: OfferStatus = "new";
  if (offer.status === "PENDING") status = "new";
  else if (offer.status === "NEGOTIATING") status = "negotiating";
  else if (offer.status === "ACCEPTED") status = "confirmed";
  else if (offer.status === "DECLINED" || offer.status === "EXPIRED") status = "history";

  return {
    id: offer.id,
    status,
    isMyTurn: offer.actionRequiredBy === "FARMER",
    buyer: {
      name: "Buyer " + offer.buyerId.slice(-4),
      initials: "B",
      subtitle: "Verified Buyer"
    },
    rate: offer.pricePerKg,
    quantityKg: offer.quantityKg,
    total: offer.total,
    contractId: offer.orderId,
    yourCounter: offer.negotiationHistory.reverse().find((h) => h.senderType === "FARMER")
      ?.proposedPrice,
    buyerCounter: offer.negotiationHistory.reverse().find((h) => h.senderType === "BUYER")
      ?.proposedPrice,
    latestMessage: offer.negotiationHistory[offer.negotiationHistory.length - 1]?.note
  };
}

export default function OffersScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [filter, setFilter] = useState<OfferStatus | "all">("all");

  const [negotiatingOfferId, setNegotiatingOfferId] = useState<string | null>(null);
  const [viewHistoryOfferId, setViewHistoryOfferId] = useState<string | null>(null);

  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const req = useRequest(() => listingsApi.get(token ?? "", id), `${token}|${id}`);

  const offersReq = useRequest(
    () => offersApi.forListing(token ?? "", id),
    `offers|${token}|${id}`
  );

  const allOffers = (offersReq.data ?? []).map(mapOfferToUI);

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(offersReq.silentRefresh, 10000);
      return () => clearInterval(timer);
    }, [offersReq.silentRefresh])
  );

  const filters = [
    { key: "all", label: "All", count: allOffers.length },
    { key: "new", label: "New", count: allOffers.filter((o) => o.status === "new").length },
    {
      key: "negotiating",
      label: "Negotiating",
      count: allOffers.filter((o) => o.status === "negotiating").length
    },
    {
      key: "confirmed",
      label: "Confirmed",
      count: allOffers.filter((o) => o.status === "confirmed").length
    },
    {
      key: "history",
      label: "History",
      count: allOffers.filter((o) => o.status === "history").length
    }
  ] as const;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <HStack className="px-4 py-2 items-center gap-2.5">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-muted items-center justify-center shrink-0 active:scale-95 transition-transform"
        >
          <BackIcon />
        </Pressable>
        <VStack className="min-w-0">
          <Heading className="text-[17px] font-bold leading-tight tracking-tight text-foreground">
            Offers & Negotiations
          </Heading>
          {req.status === "loading" && <View className="h-4 w-32 mt-1 rounded bg-muted" />}
          {req.status === "error" && (
            <Text className="text-[12px] text-destructive mt-1">Failed to load listing</Text>
          )}
          {req.status === "ready" && (
            <HStack className="items-center gap-1.5 mt-0.5">
              <Text className="text-[12px] font-medium text-muted-foreground">
                {cropById(req.data.cropId)?.name ?? "Unknown crop"}
              </Text>
              <View className="w-1 h-1 rounded-full bg-border" />
              <Text className="text-[12px] font-medium text-muted-foreground">
                {req.data.quantityKg} kg{req.data.grade ? ` · Grade ${req.data.grade}` : ""}
              </Text>
            </HStack>
          )}
        </VStack>
      </HStack>

      {/* TODO: replace hardcoded offers with offersApi.list(token, id) when ready */}
      {/* Filters */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-border"
          contentContainerClassName="px-4 py-3 gap-2 items-center"
        >
          {filters.map((f) => {
            const selected = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={[
                  "flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm",
                  selected ? "bg-brand-deep border-brand-deep" : "bg-card border-border"
                ].join(" ")}
              >
                <Text
                  className={[
                    "type-body-sm-bold",
                    selected ? "text-brand-deep-foreground" : "text-muted-foreground"
                  ].join(" ")}
                >
                  {f.label}
                </Text>
                {f.count > 0 && (
                  <View
                    className={[
                      "px-1 h-4 min-w-[16px] rounded-full items-center justify-center",
                      selected ? "bg-white/20" : "bg-muted"
                    ].join(" ")}
                  >
                    <Text
                      className={[
                        "text-[10px] font-black",
                        selected ? "text-white" : "text-muted-foreground"
                      ].join(" ")}
                    >
                      {f.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-4 gap-3.5 pb-28">
        {offersReq.status === "loading" && (
          <Text className="text-center text-muted-foreground mt-4">Loading offers...</Text>
        )}
        {offersReq.status === "error" && (
          <Text className="text-center text-destructive mt-4">Failed to load offers.</Text>
        )}
        {offersReq.status === "ready" && allOffers.length === 0 && (
          <Text className="text-center text-muted-foreground mt-4">No offers yet.</Text>
        )}
        {allOffers
          .filter((offer) => {
            if (filter === "all") return true;
            return offer.status === filter;
          })
          .map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onNegotiate={() => setNegotiatingOfferId(offer.id)}
              onViewHistory={() => setViewHistoryOfferId(offer.id)}
            />
          ))}
      </ScrollView>

      {negotiatingOfferId && (
        <NegotiateSheet
          isOpen={true}
          onClose={() => setNegotiatingOfferId(null)}
          offer={allOffers.find((o) => o.id === negotiatingOfferId)!}
          onSubmit={async (rate, quantity, note) => {
            if (!token) return;
            try {
              await offersApi.negotiate(token, negotiatingOfferId, {
                senderType: "FARMER",
                proposedPrice: rate,
                proposedQuantityKg: quantity,
                note: note || undefined
              });
              offersReq.reload(); // refresh the list
            } catch (err) {
              console.error("Failed to negotiate:", err);
            } finally {
              setNegotiatingOfferId(null);
            }
          }}
        />
      )}

      {viewHistoryOfferId && (
        <NegotiationHistorySheet
          isOpen={true}
          onClose={() => setViewHistoryOfferId(null)}
          offer={(offersReq.data ?? []).find((o) => o.id === viewHistoryOfferId) ?? null}
        />
      )}
    </View>
  );
}
