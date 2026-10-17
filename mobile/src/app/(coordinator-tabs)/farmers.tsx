/**
 * Farmers — every member of the coordinator's cooperative, their verification status and how
 * much they have listed. Figma (node 217:2) also shows a search field — no search endpoint
 * exists yet (`.plans/coordination/OPEN.md` #5), so it is not wired up. Tapping a row opens
 * `/farmer/:id` (FARM-44) — everything the farmer gave at registration, and the real
 * approve/reject actions, rather than deciding from a bare name on this list.
 *
 * Region's "farmers to verify" stat and the "Needs you today" `verify_farmer` task both link
 * here with `?filter=pending_review` so the list lands already filtered.
 */

import type { CooperativeFarmer } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { CheckCircleIcon, ClockIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { FarmerStatusPill } from "@/features/coordination/farmer-status-pill";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Filter = "all" | "active" | "pending_review";

/* Ids and key paths only — a `label` here would be resolved at module load, before i18next has
   a language, and would not change when the user switches one. */
const FILTERS: { id: Filter; labelKey: string; icon?: typeof CheckCircleIcon }[] = [
  { id: "all", labelKey: "coordinator.filters.all" },
  { id: "active", labelKey: "farmerStatus.verified", icon: CheckCircleIcon },
  { id: "pending_review", labelKey: "farmerStatus.pending", icon: ClockIcon }
];

function isFilter(value: string | undefined): value is Filter {
  return value === "all" || value === "active" || value === "pending_review";
}

export default function FarmersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { filter: requestedFilter } = useLocalSearchParams<{ filter?: string }>();
  const farmers = useRequest(() => coordinationApi.farmers(token ?? ""), token ?? "");
  const [filter, setFilter] = useState<Filter>(isFilter(requestedFilter) ? requestedFilter : "all");

  useFocusEffect(useReloadOnRefocus(farmers.reload));

  return (
    <View className="flex-1 bg-background">
      <CoordinatorHeader
        title={t("coordinator.farmersTab.title")}
        subtitle={
          farmers.status === "ready"
            ? `${farmers.data.length} ${farmers.data.length === 1 ? "farmer" : "farmers"}`
            : undefined
        }
      />

      <RequestView request={farmers}>
        {(rows) => {
          const filtered = rows.filter((f) => filter === "all" || f.status === filter);
          const verifiedCount = rows.filter((f) => f.status === "active").length;
          const pendingCount = rows.filter((f) => f.status === "pending_review").length;
          return (
            <FlatList
              data={filtered}
              keyExtractor={(f) => f.id}
              contentContainerClassName="gap-3 p-gutter"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={
                <VStack className="mb-3 gap-3">
                  {/* A quick breakdown before the filter pills — the header subtitle only says
                      the total, so this is the one place to see verified vs. pending at a
                      glance without tapping through each filter. Read-only, not bordered like
                      the pills below, so it doesn't read as another tappable control. */}
                  <HStack className="gap-4">
                    <HStack className="items-center gap-1.5">
                      <Icon as={CheckCircleIcon} className="text-success" size="sm" />
                      <Text className="type-body-sm text-muted-foreground">
                        {verifiedCount} verified
                      </Text>
                    </HStack>
                    <HStack className="items-center gap-1.5">
                      <Icon as={ClockIcon} className="text-warning" size="sm" />
                      <Text className="type-body-sm text-muted-foreground">
                        {pendingCount} pending
                      </Text>
                    </HStack>
                  </HStack>

                  <HStack className="gap-2">
                    {FILTERS.map(({ id, labelKey, icon }) => {
                      const selected = filter === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => setFilter(id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className={[
                            "min-h-tap flex-row items-center justify-center gap-1.5 rounded-chip border px-4",
                            selected ? "border-primary bg-primary" : "border-border bg-card"
                          ].join(" ")}
                        >
                          {icon ? (
                            <Icon
                              as={icon}
                              className={selected ? "text-primary-foreground" : "text-foreground"}
                              size="sm"
                            />
                          ) : null}
                          <Text
                            className={`type-body-sm-bold ${
                              selected ? "text-primary-foreground" : "text-foreground"
                            }`}
                          >
                            {t(labelKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </HStack>
                </VStack>
              }
              renderItem={({ item }) => <FarmerRow farmer={item} />}
              ListEmptyComponent={
                <EmptyNote
                  title={t("coordinator.farmersTab.none")}
                  note={t("coordinator.farmersTab.noneBody")}
                />
              }
            />
          );
        }}
      </RequestView>
    </View>
  );
}

function FarmerRow({ farmer }: { farmer: CooperativeFarmer }) {
  const { t } = useTranslation();
  const router = useRouter();
  const initial = farmer.displayName.trim().charAt(0).toUpperCase() || "?";
  const secondLine =
    farmer.status === "pending_review"
      ? t("coordinator.farmersTab.pendingReview")
      : farmer.district
        ? `${farmer.district} · 🌿 ${farmer.listingCount} ${farmer.listingCount === 1 ? "listing" : "listings"}`
        : t("coordinator.farmersTab.noListings");

  return (
    <Pressable
      onPress={() => router.push(`/farmer/${farmer.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${farmer.displayName}`}
      className={[
        "elevation-card min-h-tap items-center gap-3 rounded-card border p-3",
        "flex-row",
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
    </Pressable>
  );
}
