/** Incoming orders — every purchase request on this farmer's listings, newest first (FARM-46). */

import { cropById } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { ordersApi } from "@/features/orders/api";
import { OrderStatusPill } from "@/features/orders/status-pill";
import { formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const orders = useRequest(() => ordersApi.incoming(token ?? ""), token ?? "");

  // Coming back from a detail screen (after an accept or a decline) shows the new status.
  useFocusEffect(useReloadOnRefocus(orders.reload));

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Text className="type-h2 px-gutter pt-4 text-foreground">Incoming orders</Text>
      <RequestView request={orders}>
        {(rows) => (
          <FlatList
            data={rows}
            keyExtractor={(o) => o.id}
            contentContainerClassName="gap-3 p-gutter"
            renderItem={({ item }) => {
              const crop = cropById(item.cropId);
              return (
                <Pressable
                  onPress={() => router.push({ pathname: "/orders/[id]", params: { id: item.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${crop.name}, ${item.quantityKg} kilos, ${formatPrice(item.total)}`}
                  className="elevation-card min-h-tap flex-row items-center gap-3 rounded-card border border-border bg-card p-3"
                >
                  <CropTile emoji={crop.emoji} />
                  <VStack className="flex-1 gap-0.5">
                    <Text className="type-body-bold text-foreground" numberOfLines={1}>
                      {crop.name} · {item.quantityKg} kg
                    </Text>
                    <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                      {formatPrice(item.total)}
                    </Text>
                  </VStack>
                  <OrderStatusPill status={item.status} />
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <EmptyNote
                title="No orders yet"
                note="Orders buyers place on your listings will appear here."
              />
            }
          />
        )}
      </RequestView>
    </View>
  );
}
