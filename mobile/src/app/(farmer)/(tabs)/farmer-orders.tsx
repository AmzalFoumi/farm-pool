/** Incoming orders — every purchase request on this farmer's listings, newest first (FARM-46). */

import { cropById, type Order } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { ordersApi } from "@/features/orders/api";
import { OrderStatusPill } from "@/features/orders/status-pill";
import { formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type OrderFilter = "all" | "needs_response" | "in_progress" | "completed";

const FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_response", label: "Needs Response" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" }
];

export default function FarmerOrdersScreen() {
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
          <FarmerOrdersBody
            rows={rows}
            reload={orders.reload}
            isReloading={orders.status === "loading"}
            insetsBottom={insets.bottom}
          />
        )}
      </RequestView>
    </View>
  );
}

function FarmerOrdersBody({
  rows,
  reload,
  isReloading,
  insetsBottom
}: {
  rows: Order[];
  reload: () => void;
  isReloading: boolean;
  insetsBottom: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<OrderFilter>("all");

  const counts = useMemo(() => {
    return {
      all: rows.length,
      needs_response: rows.filter((o) => o.status === "requested").length,
      in_progress: rows.filter(
        (o) =>
          o.status === "accepted" ||
          o.status === "open" ||
          o.status === "assigned" ||
          o.status === "in_transit"
      ).length,
      completed: rows.filter(
        (o) => o.status === "delivered" || o.status === "declined" || o.status === "cancelled"
      ).length
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    switch (filter) {
      case "needs_response":
        return rows.filter((o) => o.status === "requested");
      case "in_progress":
        return rows.filter(
          (o) =>
            o.status === "accepted" ||
            o.status === "open" ||
            o.status === "assigned" ||
            o.status === "in_transit"
        );
      case "completed":
        return rows.filter(
          (o) => o.status === "delivered" || o.status === "declined" || o.status === "cancelled"
        );
      case "all":
      default:
        return rows;
    }
  }, [rows, filter]);

  const emptyState = getEmptyState(filter);

  return (
    <View className="flex-1">
      {/* Horizontal filter chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row gap-2 px-gutter py-3"
        >
          {FILTERS.map(({ key, label }) => {
            const selected = filter === key;
            const count = counts[key];
            const isAlert = key === "needs_response" && count > 0;

            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label}, ${count} orders`}
                className={`min-h-tap flex-row items-center gap-2 rounded-pill border px-3.5 active:opacity-80 ${
                  selected
                    ? "border-primary bg-primary"
                    : isAlert
                      ? "border-warning bg-warning-subtle"
                      : "border-border bg-card"
                }`}
              >
                <Text
                  className={`type-body-sm-bold ${
                    selected
                      ? "text-primary-foreground"
                      : isAlert
                        ? "text-warning"
                        : "text-foreground"
                  }`}
                >
                  {label}
                </Text>
                {count > 0 ? (
                  <Box
                    className={`rounded-pill px-1.5 py-0.5 ${
                      selected ? "bg-primary-foreground" : isAlert ? "bg-warning" : "bg-muted"
                    }`}
                  >
                    <Text
                      className={`type-body-sm-bold ${
                        selected
                          ? "text-primary"
                          : isAlert
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {count}
                    </Text>
                  </Box>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders list */}
      <FlatList
        data={filteredRows}
        keyExtractor={(o) => o.id}
        refreshing={isReloading}
        onRefresh={reload}
        contentContainerClassName="gap-3 p-gutter pt-1"
        contentContainerStyle={{ paddingBottom: Math.max(insetsBottom, 16) + 24 }}
        renderItem={({ item }) => {
          const crop = cropById(item.cropId);
          const context = getOrderContext(item);

          return (
            <Pressable
              onPress={() => router.push({ pathname: "/orders/[id]", params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${crop.name}, ${item.quantityKg} kilos, ${formatPrice(item.total)}, ${context.text}`}
              className="elevation-card min-h-tap gap-2.5 rounded-card border border-border bg-card p-3.5"
            >
              <HStack className="items-center gap-3">
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
              </HStack>

              <Box className="border-t border-border pt-2">
                <Text className={`type-caption ${context.toneClass}`} numberOfLines={1}>
                  {context.text}
                </Text>
              </Box>
            </Pressable>
          );
        }}
        ListEmptyComponent={<EmptyNote title={emptyState.title} note={emptyState.note} />}
      />
    </View>
  );
}

function getOrderContext(order: Order): { text: string; toneClass: string } {
  switch (order.status) {
    case "requested":
      return {
        text: "⚠️ Needs response · Tap to review & accept",
        toneClass: "text-warning"
      };
    case "accepted":
      return {
        text: "Awaiting buyer payment into escrow",
        toneClass: "text-muted-foreground"
      };
    case "open":
      return {
        text: "Order paid · Finding a delivery driver",
        toneClass: "text-warning"
      };
    case "assigned":
      return {
        text: "🚚 Driver assigned · Tap for vehicle & gate info",
        toneClass: "text-info"
      };
    case "in_transit":
      return {
        text: "🚚 Picked up · On the way to buyer",
        toneClass: "text-info"
      };
    case "delivered":
      return {
        text: "Delivered to buyer",
        toneClass: "text-success"
      };
    case "declined":
      return {
        text: "Declined by you",
        toneClass: "text-destructive"
      };
    case "cancelled":
      return {
        text: "Cancelled by buyer",
        toneClass: "text-destructive"
      };
    default:
      return {
        text: "",
        toneClass: "text-muted-foreground"
      };
  }
}

function getEmptyState(filter: OrderFilter): { title: string; note: string } {
  switch (filter) {
    case "needs_response":
      return {
        title: "No pending requests",
        note: "You have no purchase requests waiting for your response."
      };
    case "in_progress":
      return {
        title: "No orders in progress",
        note: "Orders that are paid or being delivered will appear here."
      };
    case "completed":
      return {
        title: "No completed orders",
        note: "Delivered and closed orders will appear here."
      };
    case "all":
    default:
      return {
        title: "No orders yet",
        note: "Orders buyers place on your listings will appear here."
      };
  }
}
