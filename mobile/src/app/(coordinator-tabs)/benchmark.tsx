/**
 * Daily Benchmark (FARM-37, Figma node 202:140) — every crop, the price the coordinator has
 * published for it, and what their own farmers are currently asking. Both real reads, no invented
 * numbers: the coordinator sets the price from what they already know of the market, the app's
 * job is showing them a reference, not guessing one (`.plans/coordination/OPEN.md` #3).
 *
 * A price is expected to be refreshed weekly (`isBenchmarkPriceStale`) — the search box and the
 * Set/Stale/Not set filter both key off the same three states, so a coordinator can jump straight
 * to what needs attention. Tapping a row opens Set Crop Price (Figma node 428:5) for that crop.
 */

import type { CropPriceContext } from "@farm-pool/shared";
import { cropById, isBenchmarkPriceStale } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { SearchIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { formatDate, formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Status = "set" | "stale" | "not_set";
type Filter = "all" | Status;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "set", label: "Set" },
  { id: "stale", label: "Stale" },
  { id: "not_set", label: "Not set" }
];

function statusOf(context: CropPriceContext): Status {
  if (!context.current) return "not_set";
  return isBenchmarkPriceStale(context.current.publishedAt) ? "stale" : "set";
}

function matchesSearch(context: CropPriceContext, needle: string) {
  return cropById(context.cropId).name.toLowerCase().includes(needle);
}

export default function BenchmarkScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const prices = useRequest(() => coordinationApi.benchmarks(token ?? ""), token ?? "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useFocusEffect(useReloadOnRefocus(prices.reload));

  const stats =
    prices.status === "ready"
      ? { priced: prices.data.filter((row) => row.current).length, total: prices.data.length }
      : undefined;
  const needle = query.trim().toLowerCase();

  return (
    <View className="flex-1 bg-background">
      <CoordinatorHeader
        title="Daily benchmark"
        subtitle={stats && `${stats.priced}/${stats.total} priced`}
      />

      <RequestView request={prices}>
        {(rows) => {
          const filtered = rows.filter(
            (row) => (filter === "all" || statusOf(row) === filter) && matchesSearch(row, needle)
          );
          return (
            <FlatList
              data={filtered}
              keyExtractor={(row) => row.cropId}
              contentContainerClassName="gap-3 p-gutter"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={
                <VStack className="mb-3 gap-3">
                  <Input className="h-tap rounded-field border-0 bg-card px-4">
                    <InputSlot>
                      <InputIcon as={SearchIcon} />
                    </InputSlot>
                    <InputField
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search crop"
                      returnKeyType="search"
                      autoCorrect={false}
                      className="type-body"
                    />
                  </Input>
                  <HStack className="gap-2">
                    {FILTERS.map(({ id, label }) => {
                      const selected = filter === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => setFilter(id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className={[
                            "min-h-tap items-center justify-center rounded-chip border px-4",
                            selected ? "border-primary bg-primary" : "border-border bg-card"
                          ].join(" ")}
                        >
                          <Text
                            className={`type-body-sm-bold ${
                              selected ? "text-primary-foreground" : "text-foreground"
                            }`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </VStack>
              }
              renderItem={({ item }) => <CropPriceRow context={item} />}
              ListEmptyComponent={
                <EmptyNote title="No crops here" note="Nothing matches this search or filter." />
              }
            />
          );
        }}
      </RequestView>
    </View>
  );
}

function CropPriceRow({ context }: { context: CropPriceContext }) {
  const router = useRouter();
  const crop = cropById(context.cropId);
  const stale = context.current ? isBenchmarkPriceStale(context.current.publishedAt) : false;

  return (
    <Pressable
      onPress={() => router.push(`/benchmark/${context.cropId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Set price for ${crop.name}`}
      className="elevation-card min-h-tap gap-2 rounded-card border border-border bg-card p-3"
    >
      <HStack className="items-center justify-between">
        <Text className="type-body-bold text-foreground">
          {crop.emoji} {crop.name}
        </Text>
        {context.current ? (
          <Text className="type-body-bold text-foreground">
            {formatPrice(context.current.lowPricePerKg)}–
            {formatPrice(context.current.highPricePerKg)}
          </Text>
        ) : (
          <Box className="rounded-pill bg-warning-subtle px-3 py-1">
            <Text className="type-body-sm-bold text-warning">Not set</Text>
          </Box>
        )}
      </HStack>

      <Text className={`type-caption ${stale ? "text-warning" : "text-muted-foreground"}`}>
        {context.current
          ? `Set ${formatDate(context.current.publishedAt)}${stale ? " · due for a refresh" : ""}`
          : "No price published yet"}
      </Text>

      {context.activeListingRange && (
        <Text className="type-caption text-muted-foreground">
          Farmers ask {formatPrice(context.activeListingRange.lowPricePerKg)}–
          {formatPrice(context.activeListingRange.highPricePerKg)} ·{" "}
          {context.activeListingRange.listingCount}{" "}
          {context.activeListingRange.listingCount === 1 ? "listing" : "listings"}
        </Text>
      )}
    </Pressable>
  );
}
