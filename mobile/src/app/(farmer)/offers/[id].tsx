import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/providers/auth-provider";
import { useRequest } from "@/lib/use-request";
import { cropLabelKey } from "@/features/listings/crop-label";
import { listingsApi } from "@/features/listings/api";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { OfferCard, type OfferStatus } from "@/features/listings/components/offer-card";
import { NegotiateSheet } from "@/features/listings/components/negotiate-sheet";
import { NegotiationHistorySheet } from "@/features/listings/components/negotiation-history-sheet";
import { BackIcon } from "@/components/app/icons";
import { offersApi } from "@/features/offers/api";
import { ApiError } from "@/lib/api";
import { offerErrorMessage } from "@/features/offers/error-message";
import { toUiOffer } from "@/features/offers/to-ui-offer";

export default function OffersScreen() {
  const { t } = useTranslation();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [filter, setFilter] = useState<OfferStatus | "all">("all");

  const [negotiatingOfferId, setNegotiatingOfferId] = useState<string | null>(null);
  const [viewHistoryOfferId, setViewHistoryOfferId] = useState<string | null>(null);
  const [isAcceptingOfferId, setIsAcceptingOfferId] = useState<string | null>(null);
  const [isDecliningOfferId, setIsDecliningOfferId] = useState<string | null>(null);

  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  /* The farmer's own list, in every status: the public detail endpoint only returns verified
     listings, and offers outlive that (a listing goes `sold` when its last stock is agreed). */
  const req = useRequest(async () => {
    const mine = await listingsApi.mine(token ?? "");
    const found = mine.find((listing) => listing.id === id);
    if (!found) throw new ApiError(404, "listing_not_found", "This listing was not found");
    return found;
  }, `${token}|${id}`);

  const offersReq = useRequest(
    () => offersApi.forListing(token ?? "", id),
    `offers|${token}|${id}`
  );

  const allOffers = (offersReq.data ?? []).map((offer) => toUiOffer(offer, "FARMER"));

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
                {t(cropLabelKey(req.data.cropId)) ?? "Unknown crop"}
              </Text>
              <View className="w-1 h-1 rounded-full bg-border" />
              <Text className="text-[12px] font-medium text-muted-foreground">
                {req.data.quantityKg} kg{req.data.grade ? ` · Grade ${req.data.grade}` : ""}
              </Text>
            </HStack>
          )}
        </VStack>
      </HStack>

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
              onAccept={() => {
                Alert.alert(
                  "Accept Offer",
                  "Are you sure you want to accept this offer? This action will finalize the order and deduct the quantity from your listing.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Accept",
                      onPress: async () => {
                        if (!token || isAcceptingOfferId) return; // Prevent double taps or concurrent actions
                        setIsAcceptingOfferId(offer.id);
                        try {
                          const { orderId } = await offersApi.accept(token, offer.id);
                          router.push({ pathname: "/orders/[id]", params: { id: orderId } });
                        } catch (err) {
                          Alert.alert(
                            "Could not accept",
                            offerErrorMessage(err, "Failed to accept the offer. Please try again.")
                          );
                          offersReq.reload();
                        } finally {
                          setIsAcceptingOfferId(null);
                        }
                      }
                    }
                  ]
                );
              }}
              onDecline={() => {
                Alert.alert(
                  "Decline Offer",
                  "Are you sure you want to decline this offer? This action cannot be undone.",
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes, Decline",
                      style: "destructive",
                      onPress: async () => {
                        if (!token || isDecliningOfferId) return;
                        setIsDecliningOfferId(offer.id);
                        try {
                          await offersApi.decline(token, offer.id);
                          offersReq.reload();
                        } catch (err) {
                          Alert.alert(
                            "Could not decline",
                            offerErrorMessage(err, "Failed to decline the offer. Please try again.")
                          );
                        } finally {
                          setIsDecliningOfferId(null);
                        }
                      }
                    }
                  ]
                );
              }}
            />
          ))}
      </ScrollView>

      {negotiatingOfferId && (
        <NegotiateSheet
          isOpen={true}
          onClose={() => setNegotiatingOfferId(null)}
          offer={allOffers.find((o) => o.id === negotiatingOfferId)!}
          minKg={req.data?.minOrderKg ?? 1}
          maxKg={
            req.data?.quantityKg ?? allOffers.find((o) => o.id === negotiatingOfferId)!.quantityKg
          }
          onSubmit={async (rate, quantity, note) => {
            if (!token) return;
            try {
              await offersApi.negotiate(token, negotiatingOfferId, {
                proposedPrice: rate,
                proposedQuantityKg: quantity,
                note: note || undefined
              });
              offersReq.reload();
              setNegotiatingOfferId(null);
            } catch (err) {
              // The sheet stays open so what was typed is not lost.
              Alert.alert(
                "Could not send",
                offerErrorMessage(err, "Failed to send the counter-offer. Please try again.")
              );
            }
          }}
        />
      )}

      {viewHistoryOfferId && (
        <NegotiationHistorySheet
          isOpen={true}
          onClose={() => setViewHistoryOfferId(null)}
          viewer="FARMER"
          offer={(offersReq.data ?? []).find((o) => o.id === viewHistoryOfferId) ?? null}
        />
      )}
    </View>
  );
}
