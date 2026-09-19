/**
 * Farmers — every member of the coordinator's cooperative, their verification status and how
 * much they have listed. Figma (node 217:2) also shows a search field and a tappable "verify"
 * action on a pending row — no search endpoint and no approval endpoint exist yet
 * (`.plans/coordination/OPEN.md` #5), so neither is wired up; status is shown, not actioned.
 */

import type { CooperativeFarmer } from "@farm-pool/shared";
import { useFocusEffect } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { FarmerStatusPill } from "@/features/coordination/farmer-status-pill";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Filter = "all" | "active" | "pending_review";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Verified" },
  { id: "pending_review", label: "Pending" }
];

export default function FarmersScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const farmers = useRequest(() => coordinationApi.farmers(token ?? ""), token ?? "");
  const [filter, setFilter] = useState<Filter>("all");

  useFocusEffect(useReloadOnRefocus(farmers.reload));

  return (
    <View className="flex-1 bg-background">
      <CoordinatorHeader
        title="Farmers"
        subtitle={
          farmers.status === "ready"
            ? `${farmers.data.length} ${farmers.data.length === 1 ? "farmer" : "farmers"}`
            : undefined
        }
      />

      <RequestView request={farmers}>
        {(rows) => {
          const filtered = rows.filter((f) => filter === "all" || f.status === filter);
          return (
            <FlatList
              data={filtered}
              keyExtractor={(f) => f.id}
              contentContainerClassName="gap-3 p-gutter"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={
                <HStack className="mb-3 gap-2">
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
              }
              renderItem={({ item }) => <FarmerRow farmer={item} />}
              ListEmptyComponent={
                <EmptyNote title="No farmers here" note="Nobody matches this filter yet." />
              }
            />
          );
        }}
      </RequestView>
    </View>
  );
}

function FarmerRow({ farmer }: { farmer: CooperativeFarmer }) {
  const initial = farmer.displayName.trim().charAt(0).toUpperCase() || "?";
  const secondLine =
    farmer.status === "pending_review"
      ? "Pending review"
      : farmer.district
        ? `${farmer.district} · ${farmer.listingCount} ${farmer.listingCount === 1 ? "listing" : "listings"}`
        : "No listings yet";

  return (
    <HStack
      className={[
        "elevation-card min-h-tap items-center gap-3 rounded-card border p-3",
        farmer.status === "pending_review"
          ? "border-warning bg-warning-subtle"
          : "border-border bg-card"
      ].join(" ")}
    >
      <Box className="h-11 w-11 items-center justify-center rounded-pill bg-secondary">
        <Text className="type-h4 text-secondary-foreground">{initial}</Text>
      </Box>
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {farmer.displayName}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {secondLine}
        </Text>
      </VStack>
      <FarmerStatusPill status={farmer.status} />
    </HStack>
  );
}
