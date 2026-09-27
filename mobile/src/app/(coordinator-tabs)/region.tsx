/**
 * Region — the coordinator's tab-shell home. Cooperative name/district, farmer count, active
 * listing count, and "Needs you today" — all real. Figma (node 202:139) also draws a full
 * per-listing list here; that belongs on a farmer's own detail screen instead (not built yet),
 * not duplicated on a dashboard. A disputes count, a map and an export button are drawn too —
 * disputes has no backend at all yet (`.plans/coordination/OPEN.md`), so it stays at an honest
 * zero; map and export are visibly present but inert, same treatment as "Request call" on the
 * listing detail screen. Header: `CoordinatorHeader`, shared by all five tabs.
 *
 * Each stat card is tappable, to the nearest real place for it: total farmers and crop listings
 * both go to Farmers (the only screen with a per-farmer listing count — there is no dedicated
 * listings list, see the comment above); farmers to verify goes to Farmers pre-filtered to
 * "Pending"; disputes goes to the Disputes tab.
 */

import type { CoordinatorTask } from "@farm-pool/shared";
import { cropById } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { CoordinatorHeader } from "@/features/coordination/coordinator-header";
import { formatDate } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function RegionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const dashboard = useRequest(() => coordinationApi.dashboard(token ?? ""), token ?? "");
  const tasks = useRequest(() => coordinationApi.tasks(token ?? ""), token ?? "");

  useFocusEffect(useReloadOnRefocus(dashboard.reload));
  useFocusEffect(useReloadOnRefocus(tasks.reload));

  const farmersToVerify =
    tasks.status === "ready"
      ? tasks.data.filter((t) => t.kind === "verify_farmer").length
      : undefined;

  return (
    <View className="flex-1 bg-background">
      <RequestView request={dashboard}>
        {(data) => (
          <ScrollView
            contentContainerClassName="gap-3 pb-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          >
            <CoordinatorHeader
              title={`${data.cooperative.district} region`}
              subtitle={data.cooperative.name}
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
                  onPress={() => router.push("/farmers")}
                />
                <StatCard
                  tone="warning"
                  value={farmersToVerify ?? "–"}
                  label="farmers to verify"
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
                  onPress={() => router.push("/disputes")}
                />
                <StatCard
                  tone="success"
                  value={data.listingCount}
                  label="crop listings"
                  onPress={() => router.push("/farmers")}
                />
              </HStack>
            </VStack>

            <VStack className="mx-gutter h-36 items-center justify-center rounded-card bg-secondary">
              <Text className="type-body text-secondary-foreground">Map — listings by village</Text>
            </VStack>

            <VStack className="mx-gutter gap-3 rounded-card border border-border bg-card p-4">
              <Text className="type-h4 text-foreground">Needs you today</Text>
              <TasksSection tasks={tasks} />
            </VStack>

            <View className="px-gutter">
              <AppButton label="Export monthly summary" variant="outline" disabled />
            </View>
          </ScrollView>
        )}
      </RequestView>
    </View>
  );
}

const STAT_TONE = {
  info: { bg: "bg-info-subtle", text: "text-info" },
  success: { bg: "bg-success-subtle", text: "text-success" },
  warning: { bg: "bg-warning-subtle", text: "text-warning" },
  destructive: { bg: "bg-destructive-subtle", text: "text-destructive" }
} as const;

function StatCard({
  tone,
  value,
  label,
  onPress
}: {
  tone: keyof typeof STAT_TONE;
  value: number | string;
  label: string;
  onPress: () => void;
}) {
  const { bg, text } = STAT_TONE[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      className={`min-h-tap flex-1 gap-1 rounded-card p-3 ${bg}`}
    >
      <Text className={`type-h2 ${text}`}>{value}</Text>
      <Text className="type-caption text-muted-foreground">{label}</Text>
    </Pressable>
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
    const cropName = cropById(task.cropId).name;
    const subtitle =
      task.kind === "benchmark_missing"
        ? "No benchmark price set"
        : `Set ${formatDate(task.publishedAt)} · due for a refresh`;
    return (
      <Pressable
        onPress={() => router.push(`/benchmark/${task.cropId}`)}
        accessibilityRole="button"
        accessibilityLabel={`Set price for ${cropName}`}
        className="min-h-tap flex-row items-center justify-between"
      >
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground" numberOfLines={1}>
            {cropName}
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

  const title =
    task.kind === "verify_farmer"
      ? task.farmerName
      : `${cropById(task.cropId).name} · ${task.quantityKg} kg`;
  const subtitle = task.kind === "verify_farmer" ? "New farmer" : `From ${task.farmerName}`;
  const pillLabel = task.kind === "verify_farmer" ? "Verify" : "Approve";

  return (
    <HStack className="items-center justify-between">
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {subtitle}
        </Text>
      </VStack>
      {/* Present, not actioned — no approve/verify endpoint yet
          (`.plans/coordination/OPEN.md` #5). The benchmark kinds above are the actionable
          ones: they open Set Crop Price, a real write. */}
      <Box className="rounded-pill bg-info-subtle px-3 py-1">
        <Text className="type-body-sm-bold text-info">{pillLabel}</Text>
      </Box>
    </HStack>
  );
}
