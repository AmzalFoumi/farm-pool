/**
 * Listings — every crop listing from the coordinator's cooperative farmers (FARM-43), replacing
 * the "Batches" placeholder (shared-transport batching needs a `Batch` entity that does not exist
 * yet, `.plans/coordination/OPEN.md` #4 — this was never the right home for it). Tapping a row
 * opens `/listing-review/:id` — everything the farmer uploaded, with Approve/Reject.
 *
 * Named `cooperative-listings`, not `listings`: the buyer shell already owns the literal path
 * `/listings` (`(tabs)/listings.tsx`), and Expo Router strips the `(coordinator-tabs)` group
 * segment, so a same-named file here would collide with it.
 *
 * Search mirrors the buyer's browse screen exactly (`(tabs)/listings.tsx`): a client-side
 * substring match over the already-loaded page, no backend change. The pending queue sorts
 * oldest-first and shows how long each has been waiting, since that tab is the coordinator's
 * actual to-do list — the longest-waiting farmer should surface first.
 *
 * Optionally scoped to one farmer's listings via `listing-scope.ts` — the farmer detail screen's
 * "Listings" row sets it, then pushes here. Not a route param: `/farmer/:id` sits outside
 * `(coordinator-tabs)`, and pushing into a `NativeTabs` route from there did not reliably carry
 * `params` through (confirmed twice — the tab kept showing every farmer's listings regardless).
 * The scope is consumed once per focus, so arriving via the tab bar directly (nothing pending)
 * correctly resets to unscoped rather than getting stuck on the last-viewed farmer.
 */

import { cropById, type Listing, type ListingStatus } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { SearchIcon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { consumeScopedFarmerId } from "@/features/coordination/listing-scope";
import { useListingsVersion } from "@/features/coordination/listings-version";
import { ListingStatusPill } from "@/features/orders/status-pill";
import { daysSince, formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Filter = "all" | "pending_approval" | "verified" | "rejected";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending_approval", label: "Pending" },
  { id: "verified", label: "Verified" },
  { id: "rejected", label: "Rejected" }
];

/** Same lowercased-substring match the buyer's browse screen uses (`(tabs)/listings.tsx`). */
function matches(listing: Listing, needle: string, t: (key: string) => string) {
  const crop = cropById(listing.cropId);
  return (
    crop.name.toLowerCase().includes(needle) ||
    t(cropLabelKey(crop.id)).toLowerCase().includes(needle) ||
    listing.farmerName.toLowerCase().includes(needle) ||
    listing.district.toLowerCase().includes(needle)
  );
}

export default function CooperativeListingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const listingsVersion = useListingsVersion();
  const listings = useRequest(
    () => coordinationApi.listings(token ?? ""),
    `${token ?? ""}|${listingsVersion}`
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [farmerId, setFarmerId] = useState<string | null>(null);

  useFocusEffect(useReloadOnRefocus(listings.reload));
  useFocusEffect(useCallback(() => setFarmerId(consumeScopedFarmerId()), []));

  const onRefresh = () => {
    setRefreshing(true);
    listings.silentRefresh().finally(() => setRefreshing(false));
  };

  const scoped =
    listings.status === "ready" && farmerId
      ? listings.data.filter((l) => l.farmerId === farmerId)
      : undefined;

  return (
    <View className="flex-1 bg-background">
      <CoordinatorHeader
        title="Listings"
        subtitle={
          scoped
            ? `${scoped[0]?.farmerName ?? "This farmer"} · ${scoped.length} ${scoped.length === 1 ? "listing" : "listings"}`
            : listings.status === "ready"
              ? `${listings.data.length} ${listings.data.length === 1 ? "listing" : "listings"}`
              : undefined
        }
      />

      <View className="px-gutter pb-3">
        <Input className="h-tap rounded-field border-0 bg-card px-4">
          <InputSlot>
            <InputIcon as={SearchIcon} />
          </InputSlot>
          <InputField
            value={query}
            onChangeText={setQuery}
            placeholder="Search crop or farmer"
            returnKeyType="search"
            autoCorrect={false}
            className="type-body"
          />
        </Input>
      </View>

      <RequestView request={listings}>
        {(rows) => {
          const needle = query.trim().toLowerCase();
          let filtered = farmerId ? rows.filter((l) => l.farmerId === farmerId) : rows;
          filtered = filtered.filter((l) => filter === "all" || l.status === filter);
          if (needle) filtered = filtered.filter((l) => matches(l, needle, t));
          if (filter === "pending_approval") {
            filtered = [...filtered].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return (
            <FlatList
              data={filtered}
              keyExtractor={(l) => l.id}
              contentContainerClassName="gap-3 p-gutter"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              onRefresh={onRefresh}
              refreshing={refreshing}
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
                        accessibilityLabel={`Filter: ${label}`}
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
              renderItem={({ item }) => <ListingRow listing={item} />}
              ListEmptyComponent={
                <EmptyNote title="No listings here" note="Nobody matches this filter yet." />
              }
            />
          );
        }}
      </RequestView>
    </View>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const router = useRouter();
  const crop = cropById(listing.cropId);
  const needsWarningTone: ListingStatus[] = ["pending_approval"];
  const waiting = listing.status === "pending_approval" ? daysSince(listing.createdAt) : null;

  return (
    <Pressable
      onPress={() => router.push(`/listing-review/${listing.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Review ${t(cropLabelKey(crop.id))} listing from ${listing.farmerName}`}
      className={[
        "elevation-card min-h-tap items-center gap-3 rounded-card border p-3",
        "flex-row",
        needsWarningTone.includes(listing.status)
          ? "border-warning bg-warning-subtle"
          : "border-border bg-card"
      ].join(" ")}
    >
      <Text className="type-h3">{crop.emoji}</Text>
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {`${t(cropLabelKey(crop.id))} · ${listing.quantityKg} kg`}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {`${listing.farmerName} · ${formatPrice(listing.pricePerKg)}/kg`}
          {waiting !== null ? ` · Waiting ${waiting} ${waiting === 1 ? "day" : "days"}` : ""}
        </Text>
      </VStack>
      <ListingStatusPill status={listing.status} />
    </Pressable>
  );
}
