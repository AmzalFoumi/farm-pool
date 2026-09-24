import { cropById, type Listing } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { PlusIcon } from "@/components/app/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { listingsApi } from "@/features/listings/api";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "sold">("all");

  const loadListings = useCallback(async () => {
    if (!auth.token) return;
    try {
      const data = await listingsApi.mine(auth.token);
      setListings(data);
    } catch {
      // Fallback state if server is offline or empty
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings();
  };

  const filteredListings = listings.filter((item) => {
    if (filter === "active")
      return item.status === "verified" || item.status === "pending_approval";
    if (filter === "sold") return item.status === "sold";
    return true;
  });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View className="border-b border-border bg-card px-gutter py-3.5">
        <HStack className="items-center justify-between">
          <VStack>
            <Text className="type-caption font-semibold text-muted-foreground uppercase">
              Harvest Management
            </Text>
            <Heading className="type-title font-bold text-foreground">My Produce Listings</Heading>
          </VStack>

          <AppButton
            label="+"
            onPress={() => router.push("/(farmer)/create-listing/create")}
            className="h-10 w-12"
          />
        </HStack>
      </View>

      {/* ── Filter Tab Bar ────────────────────────────────────────── */}
      <HStack className="border-b border-border bg-card px-gutter py-2 gap-2">
        {(["all", "active", "sold"] as const).map((tabKey) => {
          const selected = filter === tabKey;
          const label = tabKey === "all" ? "All" : tabKey === "active" ? "Active" : "Sold";
          return (
            <Pressable
              key={tabKey}
              onPress={() => setFilter(tabKey)}
              className={[
                "min-h-tap flex-1 items-center justify-center rounded-chip border",
                selected ? "border-primary bg-primary/10" : "border-border bg-card"
              ].join(" ")}
            >
              <Text
                className={`type-body-bold ${selected ? "text-primary" : "text-muted-foreground"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-gutter pt-4 pb-12 gap-3"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#166534" />
            <Text className="type-body text-muted-foreground mt-3">Loading your listings…</Text>
          </View>
        ) : filteredListings.length === 0 ? (
          <Card className="items-center justify-center py-10 px-4 bg-card border-border">
            <Text className="type-body-bold text-foreground">No listings found</Text>
            <Text className="type-body text-muted-foreground text-center mt-1">
              You have not posted any produce batches under this tab yet.
            </Text>
            <AppButton
              label="Create Listing (+)"
              icon={<PlusIcon />}
              onPress={() => router.push("/(farmer)/create-listing/create")}
            />
          </Card>
        ) : (
          filteredListings.map((item) => {
            const crop = cropById(item.cropId);
            return (
              <Card key={item.id} className="bg-card p-4 border-border gap-3">
                <HStack className="items-start justify-between">
                  <VStack>
                    <HStack className="items-center gap-2">
                      <Text className="type-title font-bold text-foreground">
                        {crop?.name ?? item.cropId}
                      </Text>
                      <Badge variant="outline" className="bg-secondary border-border">
                        <Text className="type-caption-bold text-secondary-foreground">
                          {item.district}
                        </Text>
                      </Badge>
                    </HStack>
                    <Text className="type-caption text-muted-foreground mt-0.5">
                      Harvest: {item.harvestDate}
                    </Text>
                  </VStack>

                  <Badge
                    variant="outline"
                    className={
                      item.status === "verified"
                        ? "bg-emerald-500/15 border-emerald-500/30"
                        : "bg-amber-500/15 border-amber-500/30"
                    }
                  >
                    <Text
                      className={
                        item.status === "verified"
                          ? "type-caption-bold text-emerald-700 dark:text-emerald-400"
                          : "type-caption-bold text-amber-700 dark:text-amber-400"
                      }
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </Badge>
                </HStack>

                <View className="h-px bg-border" />

                <HStack className="items-center justify-between">
                  <VStack>
                    <Text className="type-caption text-muted-foreground">Quantity Available</Text>
                    <Text className="type-body-bold text-foreground">{item.quantityKg} kg</Text>
                  </VStack>

                  <VStack className="items-end">
                    <Text className="type-caption text-muted-foreground">Price per kg</Text>
                    <Text className="type-title font-bold text-primary">Rs. {item.pricePerKg}</Text>
                  </VStack>
                </HStack>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
