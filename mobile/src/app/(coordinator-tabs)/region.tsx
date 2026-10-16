/**
 * Region — the coordinator's tab-shell home. Header greets the signed-in coordinator by last
 * name, with their region as the subtitle (`data.cooperative.district`, the same field the
 * header used to lead with) — personal first, place second. Farmer count, active listing count,
 * and "Needs you today" — all real. Figma (node 202:139) also draws a full per-listing list here;
 * that belongs on a farmer's own detail screen instead (not built yet), not duplicated on a
 * dashboard. A disputes count is drawn too — disputes has no backend at all yet
 * (`.plans/coordination/OPEN.md`), so it stays at an honest zero rather than being hidden or
 * invented.
 *
 * Figma's map placeholder was replaced twice over: first with "Priced outside benchmark"
 * (`PriceOutlierAlert`, since a map here would just redraw the coordinator's own district back at
 * them), then that was moved out of the prominent slot in favour of `FarmerSpotlight` — the price
 * check is still here, just quieter: it renders nothing at all unless there is an actual outlier
 * to flag, instead of always holding a card's worth of space to say "nothing wrong."
 *
 * Each stat card is tappable, to the nearest real place for it: total farmers goes to Farmers;
 * crop listings goes to the Listings tab (FARM-43); farmers to verify goes to Farmers
 * pre-filtered to "Pending"; disputes goes to the Disputes tab.
 */

import type { CoordinatorTask } from "@farm-pool/shared";
import { cropById } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FarmerIcon, LeafIcon } from "@/components/app/icons";
import { RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { AlertCircleIcon, ClockIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { FarmerSpotlight } from "@/features/coordination/farmer-spotlight";
import { useListingsVersion } from "@/features/coordination/listings-version";
import { PriceOutlierAlert } from "@/features/coordination/price-outlier-alert";
import { StatCard } from "@/features/coordination/stat-card";
import { CropTile } from "@/features/listings/crop-tile";
import { formatDate, lastName } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function RegionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const listingsVersion = useListingsVersion();
  const dashboard = useRequest(
    () => coordinationApi.dashboard(token ?? ""),
    `${token ?? ""}|${listingsVersion}`
  );
  const tasks = useRequest(
    () => coordinationApi.tasks(token ?? ""),
    `${token ?? ""}|${listingsVersion}`
  );
  const listings = useRequest(
    () => coordinationApi.listings(token ?? ""),
    `${token ?? ""}|${listingsVersion}`
  );
  const benchmarks = useRequest(() => coordinationApi.benchmarks(token ?? ""), token ?? "");
  const orders = useRequest(
    () => coordinationApi.orders(token ?? ""),
    `${token ?? ""}|${listingsVersion}`
  );

  useFocusEffect(useReloadOnRefocus(dashboard.reload));
  useFocusEffect(useReloadOnRefocus(tasks.reload));
  useFocusEffect(useReloadOnRefocus(listings.reload));
  useFocusEffect(useReloadOnRefocus(benchmarks.reload));
  useFocusEffect(useReloadOnRefocus(orders.reload));

  const farmersToVerify =
    tasks.status === "ready"
      ? tasks.data.filter((t) => t.kind === "verify_farmer").length
      : undefined;

  return (
    <View className="flex-1 bg-background">
      <RequestView request={dashboard}>
        {(data) => (
          <ScrollView
            contentContainerClassName="gap-4 pb-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            <CoordinatorHeader
              title={user ? `Hello, ${lastName(user.displayName)}` : "Hello"}
              subtitle={`${data.cooperative.district} region`}
            />

            {/* 2×2. Info for a headcount, warning for something pending your action, destructive
                for a problem, success for supply that is live. "Farmers to verify" is real
                (pending-review accounts); "disputes" has no backend at all, so it stays at an
                honest zero rather than being hidden or invented. */}
            <VStack className="gap-3 px-gutter">
              <HStack className="gap-3">
                <StatCard
                  tone="info"
                  value={data.farmerCount}
                  label="total farmers"
                  icon={<FarmerIcon size={22} />}
                  onPress={() => router.push("/farmers")}
                />
                <StatCard
                  tone="warning"
                  value={farmersToVerify ?? "–"}
                  label="farmers to verify"
                  icon={<Icon as={ClockIcon} className="text-warning" size="md" />}
                  zeroLabel="All verified"
                  onPress={() =>
                    router.push({ pathname: "/farmers", params: { filter: "pending_review" } })
                  }
                />
              </HStack>
              <HStack className="gap-3">
                <StatCard
                  tone="destructive"
                  value={0}
                  label="current disputes"
                  icon={<Icon as={AlertCircleIcon} className="text-destructive" size="md" />}
                  zeroLabel="No disputes"
                  onPress={() => router.push("/disputes")}
                />
                <StatCard
                  tone="success"
                  value={data.listingCount}
                  label="crop listings"
                  icon={<LeafIcon />}
                  onPress={() => router.push("/cooperative-listings")}
                />
              </HStack>
            </VStack>

            <FarmerSpotlight listings={listings} orders={orders} />

            <PriceOutlierAlert listings={listings} benchmarks={benchmarks} />

            <VStack className="mx-gutter gap-3 rounded-card border border-border bg-card p-4">
              <HStack className="items-center gap-2">
                <Icon as={ClockIcon} className="text-muted-foreground" size="sm" />
                <Text className="type-h4 text-foreground">Needs you today</Text>
              </HStack>
              <TasksSection tasks={tasks} />
            </VStack>
          </ScrollView>
        )}
      </RequestView>
    </View>
  );
}

/**
 * A small inline section, not `RequestView`: that component's loading/error states are built to
 * fill a whole screen (`flex-1`), which collapses to nothing inside a card this size.
 */
function TasksSection({ tasks }: { tasks: ReturnType<typeof useRequest<CoordinatorTask[]>> }) {
  if (tasks.status === "loading") {
    return (
      <HStack className="items-center gap-2 py-2">
        <Spinner size="small" />
        <Text className="type-body text-muted-foreground">Checking…</Text>
      </HStack>
    );
  }
  if (tasks.status === "error") {
    return <Text className="type-body text-muted-foreground">Could not check right now.</Text>;
  }
  if (tasks.data.length === 0) {
    return (
      <Text className="type-body text-muted-foreground">Nothing needs your attention yet.</Text>
    );
  }
  return (
    <VStack className="gap-2">
      {tasks.data.map((task, i) => (
        <TaskRow key={`${task.kind}-${i}`} task={task} />
      ))}
    </VStack>
  );
}

function TaskRow({ task }: { task: CoordinatorTask }) {
  const router = useRouter();

  if (task.kind === "benchmark_missing" || task.kind === "benchmark_stale") {
    const crop = cropById(task.cropId);
    const subtitle =
      task.kind === "benchmark_missing"
        ? "No benchmark price set"
        : `Set ${formatDate(task.publishedAt)} · due for a refresh`;
    return (
      <Pressable
        onPress={() => router.push(`/benchmark/${task.cropId}`)}
        accessibilityRole="button"
        accessibilityLabel={`Set price for ${crop.name}`}
        className="min-h-tap flex-row items-center gap-3"
      >
        <CropTile emoji={crop.emoji} />
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground" numberOfLines={1}>
            {crop.name}
          </Text>
          <Text className="type-caption text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        </VStack>
        <Box className="rounded-pill bg-info-subtle px-3 py-1">
          <Text className="type-body-sm-bold text-info">
            {task.kind === "benchmark_missing" ? "Set price" : "Update price"}
          </Text>
        </Box>
      </Pressable>
    );
  }

  if (task.kind === "verify_farmer") {
    const initial = task.farmerName.trim().charAt(0).toUpperCase() || "?";
    return (
      <Pressable
        onPress={() => router.push(`/farmer/${task.farmerId}`)}
        accessibilityRole="button"
        accessibilityLabel={`Review ${task.farmerName}`}
        className="min-h-tap flex-row items-center gap-3"
      >
        <Box className="h-13 w-13 items-center justify-center rounded-pill bg-secondary">
          <Text className="type-h4 text-secondary-foreground">{initial}</Text>
        </Box>
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground" numberOfLines={1}>
            {task.farmerName}
          </Text>
          <Text className="type-caption text-muted-foreground" numberOfLines={1}>
            New farmer
          </Text>
        </VStack>
        <Box className="rounded-pill bg-info-subtle px-3 py-1">
          <Text className="type-body-sm-bold text-info">Review</Text>
        </Box>
      </Pressable>
    );
  }

  const crop = cropById(task.cropId);
  return (
    <Pressable
      onPress={() => router.push(`/listing-review/${task.listingId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Review ${crop.name} listing from ${task.farmerName}`}
      className="min-h-tap flex-row items-center gap-3"
    >
      <CropTile emoji={crop.emoji} />
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {`${crop.name} · ${task.quantityKg} kg`}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {`From ${task.farmerName}`}
        </Text>
      </VStack>
      <Box className="rounded-pill bg-info-subtle px-3 py-1">
        <Text className="type-body-sm-bold text-info">Review</Text>
      </Box>
    </Pressable>
  );
}
