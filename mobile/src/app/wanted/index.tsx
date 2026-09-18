/** My requests — the crops this buyer has asked for, with a way to close one. */

import { cropById, type WantedListing } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { WantedStatusPill } from "@/features/orders/status-pill";
import { wantedApi } from "@/features/wanted/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function WantedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const wanted = useRequest(() => wantedApi.mine(token ?? ""), token ?? "");
  const [closing, setClosing] = useState<string | null>(null);

  useFocusEffect(useReloadOnRefocus(wanted.reload));

  const close = async (item: WantedListing) => {
    setClosing(item.id);
    try {
      await wantedApi.close(token ?? "", item.id);
      wanted.reload();
    } finally {
      setClosing(null);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppBar title="My requests" />
      <RequestView request={wanted}>
        {(rows) => (
          <FlatList
            data={rows}
            keyExtractor={(w) => w.id}
            contentContainerClassName="gap-3 p-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const crop = cropById(item.cropId);
              return (
                <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-3">
                  <HStack className="items-center gap-3">
                    <CropTile emoji={crop.emoji} />
                    <VStack className="flex-1 gap-0.5">
                      <Text className="type-body-bold text-foreground" numberOfLines={1}>
                        {crop.name} · {item.quantityKg} kg
                      </Text>
                      <Text className="type-caption text-muted-foreground" numberOfLines={2}>
                        By {formatDate(item.neededBy)} · {item.district}
                        {item.maxPricePerKg ? ` · up to ${formatPrice(item.maxPricePerKg)}/kg` : ""}
                      </Text>
                    </VStack>
                    <WantedStatusPill status={item.status} />
                  </HStack>
                  {item.status === "open" ? (
                    <Pressable
                      onPress={() => void close(item)}
                      disabled={closing === item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Close request for ${crop.name}`}
                      className="min-h-tap items-center justify-center rounded-field border border-border"
                    >
                      <Text className="type-body-bold text-muted-foreground">
                        {closing === item.id ? "Closing…" : "Close request"}
                      </Text>
                    </Pressable>
                  ) : null}
                </VStack>
              );
            }}
            ListEmptyComponent={
              <EmptyNote
                title="No requests yet"
                note="Tell farmers what you are looking for and they can respond."
              />
            }
          />
        )}
      </RequestView>
      <VStack
        className="border-t border-border bg-card px-gutter pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <AppButton label="New request" onPress={() => router.push("/wanted/new")} />
      </VStack>
    </View>
  );
}
