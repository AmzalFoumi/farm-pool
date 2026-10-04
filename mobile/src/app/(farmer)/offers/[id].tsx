import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import { Offer, OfferCard } from "@/features/listings/components/offer-card";
import { MOCK_OFFERS } from "@/features/listings/components/mock-data";
import { BackIcon } from "@/components/app/icons";

type OfferStatus = "all" | "new" | "negotiating" | "confirmed" | "history";

export default function OffersScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [filter, setFilter] = useState<OfferStatus>("all");

  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const req = useRequest(() => listingsApi.get(token ?? "", id), `${token}|${id}`);

  const filters = [
    { key: "all", label: "All", count: MOCK_OFFERS.length },
    { key: "new", label: "New", count: MOCK_OFFERS.filter((o) => o.status === "new").length },
    {
      key: "negotiating",
      label: "Negotiating",
      count: MOCK_OFFERS.filter((o) => o.status === "negotiating").length
    },
    {
      key: "confirmed",
      label: "Confirmed",
      count: MOCK_OFFERS.filter((o) => o.status === "confirmed").length
    },
    {
      key: "history",
      label: "History",
      count: MOCK_OFFERS.filter((o) => o.status === "history").length
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
        {MOCK_OFFERS.filter((offer) => {
          if (filter === "all") return true;
          return offer.status === filter;
        }).map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </ScrollView>
    </View>
  );
}
