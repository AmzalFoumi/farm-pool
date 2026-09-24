import { CROPS, formatBenchmarkPriceRange, getBenchmarkForCrop } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { LeafIcon, PlusIcon } from "@/components/app/icons";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const displayName = auth.user?.displayName ?? "Farmer";

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View className="border-b border-border bg-card px-gutter py-3.5">
        <HStack className="items-center justify-between">
          <VStack className="gap-0.5">
            <HStack className="items-center gap-2">
              <Text className="type-caption font-semibold text-muted-foreground uppercase tracking-wider">
                Farmer Dashboard
              </Text>
              <Badge variant="outline" className="bg-primary/10 border-primary/20">
                <Text className="type-caption-bold text-primary">Active</Text>
              </Badge>
            </HStack>
            <Heading className="type-title font-bold text-foreground">
              Ayubowan, {displayName}!
            </Heading>
          </VStack>
          <Box className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <LeafIcon />
          </Box>
        </HStack>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-gutter pt-4 pb-12 gap-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* ── Primary Call to Action Card ────────────────────────── */}
        <Card className="overflow-hidden border-brand-deep/20 bg-brand-deep p-4.5 shadow-sm">
          <VStack className="gap-3">
            <VStack className="gap-1">
              <Text className="type-caption font-semibold text-brand-deep-muted uppercase">
                Sell Your Farm Harvest
              </Text>
              <Text className="type-title-lg font-bold text-brand-deep-foreground">
                Post New Produce Batch
              </Text>
              <Text className="type-body text-brand-deep-muted">
                Connect directly with verified wholesale buyers across Sri Lanka.
              </Text>
            </VStack>

            <AppButton
              label="Create Listing (+)"
              icon={<PlusIcon />}
              onPress={() => router.push("/(farmer)/create-listing/create")}
              className="mt-1 bg-card border border-border"
            />
          </VStack>
        </Card>

        {/* ── Metric Grid ────────────────────────────────────────── */}
        <VStack className="gap-2.5">
          <Text className="type-body-bold text-foreground">Harvest & Escrow Overview</Text>
          <HStack className="gap-3">
            <Card className="flex-1 bg-card p-3.5 border-border">
              <Text className="type-caption text-muted-foreground">Active Produce</Text>
              <Text className="type-title-lg font-bold text-foreground mt-1">2 Batches</Text>
              <Text className="type-caption text-primary mt-1">Ready for pickup</Text>
            </Card>

            <Card className="flex-1 bg-card p-3.5 border-border">
              <Text className="type-caption text-muted-foreground">Escrow Balance</Text>
              <Text className="type-title-lg font-bold text-foreground mt-1">Rs. 85,000</Text>
              <Text className="type-caption text-muted-foreground mt-1">2 Pending orders</Text>
            </Card>
          </HStack>
        </VStack>

        {/* ── Wholesale Market Price Ticker ──────────────────────── */}
        <VStack className="gap-2.5">
          <HStack className="items-center justify-between">
            <Text className="type-body-bold text-foreground">Today's Wholesale Benchmark</Text>
            <Text className="type-caption text-primary font-semibold">Dambulla Market</Text>
          </HStack>

          <VStack className="gap-2">
            {CROPS.slice(0, 4).map((crop) => {
              const bm = getBenchmarkForCrop(crop.id);
              return (
                <Card key={crop.id} className="bg-card p-3 border-border">
                  <HStack className="items-center justify-between">
                    <HStack className="items-center gap-3">
                      <Box className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
                        <Text className="type-body-bold text-secondary-foreground">
                          {crop.emoji}
                        </Text>
                      </Box>
                      <VStack>
                        <Text className="type-body-bold text-foreground">{crop.name}</Text>
                        <Text className="type-caption text-muted-foreground">{crop.category}</Text>
                      </VStack>
                    </HStack>
                    <VStack className="items-end">
                      <Text className="type-body-bold text-primary">
                        {formatBenchmarkPriceRange(bm.lowPrice, bm.highPrice)}
                      </Text>
                    </VStack>
                  </HStack>
                </Card>
              );
            })}
          </VStack>
        </VStack>

        {/* ── Quick Navigation shortcuts ────────────────────────── */}
        <VStack className="gap-2 pt-2">
          <Text className="type-body-bold text-foreground">Quick Actions</Text>
          <HStack className="gap-3">
            <Pressable
              onPress={() => router.push("/(farmer)/(tabs)/listings")}
              className="flex-1 rounded-card border border-border bg-card p-3.5 items-center justify-center"
            >
              <Text className="type-body-bold text-foreground">View My Listings</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(farmer)/(tabs)/farmer-orders")}
              className="flex-1 rounded-card border border-border bg-card p-3.5 items-center justify-center"
            >
              <Text className="type-body-bold text-foreground">View Orders</Text>
            </Pressable>
          </HStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
