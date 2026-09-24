import { cropById } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { PlusIcon } from "@/components/app/icons";
import { RequestView } from "@/components/app/request-view";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { listingsApi } from "@/features/listings/api";
import { ListingStatusPill } from "@/features/orders/status-pill";
import { formatDate, formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const [filter, setFilter] = useState<"all" | "active" | "sold">("all");
  const listings = useRequest(() => listingsApi.mine(token ?? ""), token ?? "");

  // Coming back from the create wizard shows the listing just published.
  useFocusEffect(useReloadOnRefocus(listings.reload));

  const byFilter = (status: string) => {
    if (filter === "active") return status === "verified" || status === "pending_approval";
    if (filter === "sold") return status === "sold";
    return true;
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View className="border-b border-border bg-card px-gutter py-3.5">
        <HStack className="items-center justify-between">
          <VStack>
            <Text className="type-caption-bold text-muted-foreground uppercase">
              Harvest Management
            </Text>
            <Heading className="type-title text-foreground">My Produce Listings</Heading>
          </VStack>

          <Pressable
            onPress={() => router.push("/(farmer)/create-listing/create")}
            accessibilityRole="button"
            accessibilityLabel="Create listing"
            className="h-tap w-tap items-center justify-center rounded-field bg-primary active:opacity-80"
          >
            <PlusIcon />
          </Pressable>
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
                selected ? "border-primary bg-secondary" : "border-border bg-card"
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

      <RequestView request={listings}>
        {(rows) => {
          const filteredListings = rows.filter((item) => byFilter(item.status));
          return (
            <ScrollView className="flex-1" contentContainerClassName="px-gutter pt-4 pb-12 gap-3">
              {filteredListings.length === 0 ? (
                <Card className="items-center justify-center py-10 px-4 bg-card border-border">
                  <Text className="type-body-bold text-foreground">No listings found</Text>
                  <Text className="type-body text-muted-foreground text-center mt-1">
                    You have not posted any produce batches under this tab yet.
                  </Text>
                  <AppButton
                    label="Create listing"
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
                            <Text className="type-title text-foreground">
                              {crop?.name ?? item.cropId}
                            </Text>
                            <Badge variant="outline" className="bg-secondary border-border">
                              <Text className="type-caption-bold text-secondary-foreground">
                                {item.district}
                              </Text>
                            </Badge>
                          </HStack>
                          <Text className="type-caption text-muted-foreground mt-0.5">
                            Harvest: {formatDate(item.harvestDate)}
                          </Text>
                        </VStack>

                        <ListingStatusPill status={item.status} />
                      </HStack>

                      <View className="h-px bg-border" />

                      <HStack className="items-center justify-between">
                        <VStack>
                          <Text className="type-caption text-muted-foreground">
                            Quantity Available
                          </Text>
                          <Text className="type-body-bold text-foreground">
                            {item.quantityKg} kg
                          </Text>
                        </VStack>

                        <VStack className="items-end">
                          <Text className="type-caption text-muted-foreground">Price per kg</Text>
                          <Text className="type-title text-primary">
                            {formatPrice(item.pricePerKg)}
                          </Text>
                        </VStack>
                      </HStack>
                    </Card>
                  );
                })
              )}
            </ScrollView>
          );
        }}
      </RequestView>
    </View>
  );
}
