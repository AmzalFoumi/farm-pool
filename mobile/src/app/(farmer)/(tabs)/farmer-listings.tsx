import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { View, FlatList, ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Listing, type ListingStatus } from "@farm-pool/shared";

import { RequestView } from "@/components/app/request-view";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { listingsApi } from "@/features/listings/api";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

import { FarmerListingCard } from "@/features/listings/farmer-listing-card";
import { RegionalDemandAlert } from "@/features/listings/regional-demand-alert";
import { FarmerListingActionSheet } from "@/features/listings/farmer-listing-action-sheet";
import { FarmerListingEmptyState } from "@/features/listings/farmer-listing-empty-state";

type FilterState = "active" | "paused" | "drafts" | "sold";

export default function FarmerListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { token } = useAuth();
  const [filter, setFilter] = useState<FilterState>("active");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const listings = useRequest(() => listingsApi.mine(token ?? ""), token ?? "");

  // Coming back from the create wizard shows the listing just published.
  useFocusEffect(useReloadOnRefocus(listings.reload));

  const byFilter = (status: ListingStatus) => {
    if (filter === "active") return status === "verified" || status === "pending_approval";
    if (filter === "paused") return status === "paused";
    if (filter === "drafts") return status === "draft";
    if (filter === "sold") return status === "sold";
    return false;
  };

  const getFilterCounts = (rows: Listing[]) => {
    return {
      active: rows.filter(
        (item) => item.status === "verified" || item.status === "pending_approval"
      ).length,
      paused: rows.filter((item) => item.status === "paused").length,
      drafts: rows.filter((item) => item.status === "draft").length,
      sold: rows.filter((item) => item.status === "sold").length
    };
  };

  const renderItem: ListRenderItem<Listing> = ({ item }) => (
    <FarmerListingCard
      listing={item}
      onPress={() => router.push(`/(farmer)/offers/${item.id}`)}
      onOptionsPress={() => {
        setSelectedListing(item);
        setIsActionSheetOpen(true);
      }}
      onResumePress={() => {
        // Optimistic UI update or API call to resume
        // Toast logic goes here
        setFilter("active");
      }}
      onEditPress={() => {}}
      onCompletePress={() => {}}
      offersCount={item.id.includes("offers") ? 3 : 0}
    />
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View className="py-2 mb-2 px-gutter">
        <HStack className="items-center justify-between">
          <VStack>
            <Heading className="text-[24px] font-extrabold text-foreground tracking-tight">
              My Listings
            </Heading>
            <Text className="type-body-sm-bold text-muted-foreground mt-0.5">
              Manage crop batches, live offers & escrow
            </Text>
          </VStack>
          <HStack className="items-center gap-2">
            <View className="w-9 h-9 rounded-full bg-brand-deep items-center justify-center">
              <Text className="type-body-sm-bold text-brand-deep-foreground">LK</Text>
            </View>
          </HStack>
        </HStack>
      </View>

      {/* ── Filter Tab Bar ────────────────────────────────────────── */}
      <RequestView request={listings}>
        {(rows) => {
          const counts = getFilterCounts(rows);
          const filteredListings = rows.filter((item) => byFilter(item.status));

          return (
            <>
              <View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="px-gutter pb-1 gap-2"
                  data={["active", "paused", "drafts", "sold"] as const}
                  keyExtractor={(item) => item}
                  renderItem={({ item: tabKey }) => {
                    const selected = filter === tabKey;
                    const label =
                      tabKey === "active"
                        ? "Active"
                        : tabKey === "paused"
                          ? "Paused"
                          : tabKey === "drafts"
                            ? "Drafts"
                            : "Sold";
                    const count = counts[tabKey];

                    return (
                      <Pressable
                        onPress={() => setFilter(tabKey)}
                        className={[
                          "flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border",
                          selected
                            ? "bg-brand-deep border-brand-deep shadow-sm"
                            : "bg-card border-border"
                        ].join(" ")}
                      >
                        <Text
                          className={[
                            "type-body-sm-bold",
                            selected ? "text-brand-deep-foreground" : "text-muted-foreground"
                          ].join(" ")}
                        >
                          {label}
                        </Text>
                        {count > 0 && tabKey !== "sold" && (
                          <View
                            className={[
                              "w-4 h-4 rounded-full items-center justify-center",
                              selected ? "bg-brand-deep-foreground" : "bg-secondary"
                            ].join(" ")}
                          >
                            <Text
                              className={[
                                "text-[10px] font-black",
                                selected ? "text-brand-deep" : "text-muted-foreground"
                              ].join(" ")}
                            >
                              {count}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  }}
                />
              </View>

              <FlatList
                className="flex-1"
                contentContainerClassName="px-gutter pt-3 pb-28 gap-3.5"
                data={filteredListings}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={filter === "active" ? <RegionalDemandAlert /> : null}
                ListEmptyComponent={<FarmerListingEmptyState filter={filter} />}
                renderItem={renderItem}
              />
            </>
          );
        }}
      </RequestView>

      <FarmerListingActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        listing={selectedListing}
      />
    </View>
  );
}
