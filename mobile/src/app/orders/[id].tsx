/** One order. The buyer can cancel it only while it is still `requested`. */

import { cropById, type Order } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { ordersApi } from "@/features/orders/api";
import { OrderStatusPill, orderStatusLabel } from "@/features/orders/status-pill";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const order = useRequest(() => ordersApi.get(token ?? "", id), `${token}|${id}`);

  return (
    <View className="flex-1 bg-background">
      {/* After Place order the detail replaced the listing, so "back" means the
          orders list, not the listing that no longer sits under it. */}
      <AppBar
        title="Order"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/orders"))}
      />
      <RequestView request={order}>
        {(data) => (
          <OrderBody
            order={data}
            token={token ?? ""}
            bottomInset={insets.bottom}
            onChanged={order.reload}
          />
        )}
      </RequestView>
    </View>
  );
}

function OrderBody({
  order,
  token,
  bottomInset,
  onChanged
}: {
  order: Order;
  token: string;
  bottomInset: number;
  onChanged: () => void;
}) {
  const crop = cropById(order.cropId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await ordersApi.cancel(token, order.id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel");
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    { label: "Quantity", value: `${order.quantityKg} kg` },
    { label: "Unit price", value: `${formatPrice(order.pricePerKg)} / kg` },
    { label: "Total", value: formatPrice(order.total) },
    { label: "Farmer", value: order.farmerName },
    { label: "Requested on", value: formatDate(order.createdAt) },
    ...(order.note ? [{ label: "Note", value: order.note }] : [])
  ];

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 p-gutter">
        <HStack className="items-center gap-3">
          <CropTile emoji={crop.emoji} />
          <VStack className="flex-1">
            <Text className="type-h3 text-foreground">{crop.name}</Text>
            <Text className="type-caption text-muted-foreground">
              {orderStatusLabel(order.status)}
            </Text>
          </VStack>
          <OrderStatusPill status={order.status} />
        </HStack>

        <VStack className="gap-3 rounded-card border border-border bg-card p-4">
          {rows.map(({ label, value }, i) => (
            <HStack
              key={label}
              className={`items-start justify-between gap-4 ${i > 0 ? "border-t border-border pt-3" : ""}`}
            >
              <Text className="type-body text-muted-foreground">{label}</Text>
              <Text className="type-body-bold flex-1 text-right text-foreground">{value}</Text>
            </HStack>
          ))}
        </VStack>

        {order.status === "requested" ? (
          <Text className="type-caption text-muted-foreground">
            Waiting for {order.farmerName} to accept. You can cancel until they do.
          </Text>
        ) : null}
        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}
      </ScrollView>

      {order.status === "requested" ? (
        <VStack
          className="border-t border-border bg-card px-gutter pt-3"
          style={{ paddingBottom: Math.max(bottomInset, 23) }}
        >
          <AppButton
            label={busy ? "Cancelling…" : "Cancel request"}
            variant="outline"
            onPress={() => void cancel()}
            disabled={busy}
          />
        </VStack>
      ) : null}
    </>
  );
}
