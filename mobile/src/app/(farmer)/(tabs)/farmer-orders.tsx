import type { Order } from "@farm-pool/shared";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ordersApi } from "@/lib/orders-api";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!auth.token) {
      setLoading(false);
      return;
    }
    try {
      const data = await ordersApi.myOrders(auth.token);
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View className="border-b border-border bg-card px-gutter py-3.5">
        <VStack>
          <Text className="type-caption font-semibold text-muted-foreground uppercase">
            Escrow & Logistics
          </Text>
          <Heading className="type-title font-bold text-foreground">Incoming Orders</Heading>
        </VStack>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-gutter pt-4 pb-12 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#166534" />
            <Text className="type-body text-muted-foreground mt-3">Fetching orders…</Text>
          </View>
        ) : orders.length === 0 ? (
          <Card className="items-center justify-center py-10 px-4 bg-card border-border">
            <Text className="type-body-bold text-foreground">No orders yet</Text>
            <Text className="type-body text-muted-foreground text-center mt-1">
              When wholesale buyers place orders against your produce listings, they will appear
              here with Bank Escrow tracking.
            </Text>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="bg-card p-4 border-border gap-3">
              <HStack className="items-start justify-between">
                <VStack>
                  <Text className="type-title font-bold text-foreground">
                    Order #{order.id.slice(-6).toUpperCase()}
                  </Text>
                  <Text className="type-caption text-muted-foreground mt-0.5">
                    Placed on: {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </VStack>

                <Badge variant="outline" className="bg-primary/10 border-primary/20">
                  <Text className="type-caption-bold text-primary">
                    {order.status.toUpperCase()}
                  </Text>
                </Badge>
              </HStack>

              <View className="h-px bg-border" />

              <HStack className="items-center justify-between">
                <VStack>
                  <Text className="type-caption text-muted-foreground">Ordered Quantity</Text>
                  <Text className="type-body-bold text-foreground">{order.quantityKg} kg</Text>
                </VStack>

                <VStack className="items-end">
                  <Text className="type-caption text-muted-foreground">Total Payment</Text>
                  <Text className="type-title font-bold text-primary">
                    Rs. {order.total.toLocaleString()}
                  </Text>
                </VStack>
              </HStack>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
