/**
 * Route — the driver's day, in the order they agreed to do it (FARM-61, Figma 196:5906).
 *
 * The Jobs tab answers "what work is there"; this answers "what am I doing, and in what order".
 * They are different questions and the second is the one a driver has open while driving, which is
 * why the order is numbered, the next stop is called out, and the slack is said in words rather
 * than left for them to work out from two times.
 *
 * The order is **planned on the api**, not here — the same planner decides which jobs reach the
 * board, and two answers to the same day would be worse than none.
 */

import { cropById, formatMinutesOfDay, type RouteStopView } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { logisticsApi } from "@/features/logistics/api";
import { RouteMap } from "@/features/logistics/route-map";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function DriverRouteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const route = useRequest(() => logisticsApi.route(token ?? ""), token ?? "");

  /* Confirming a pickup on a job screen changes the run, so it has to refetch — but underneath,
     not by blanking. See the Jobs tab for why. */
  useFocusEffect(useReloadOnRefocus(route.silentRefresh));

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("route.title")} />
      <RequestView request={route}>
        {(plan) =>
          plan.stops.length === 0 ? (
            <EmptyNote title={t("route.emptyTitle")} note={t("route.emptyBody")} />
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-4 px-gutter pb-6 pt-4"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
              <RouteMap stops={plan.stops} />

              {/* The run at a glance, which is what the driver checks before setting off. */}
              <VStack className="elevation-card gap-2 rounded-card border border-border bg-card p-4">
                <HStack className="items-baseline gap-2">
                  <Text className="type-h2 text-foreground">
                    {formatDuration(plan.totalMinutes)}
                  </Text>
                  <Text className="type-body text-muted-foreground">
                    {t("route.summary", {
                      km: plan.totalKm,
                      kg: plan.totalKg.toLocaleString()
                    })}
                  </Text>
                </HStack>

                <FeasibilityLine
                  feasible={plan.feasible}
                  tightestSlackMinutes={plan.tightestSlackMinutes}
                />

                {/* Said once, plainly: every number above is an estimate from straight-line
                    distance. A driver quoting a fee from it should know that. */}
                <Text className="type-body-sm text-muted-foreground">
                  {t("route.estimateNote")}
                </Text>
              </VStack>

              <VStack className="gap-0">
                {plan.stops.map((stop, index) => (
                  <RouteStopRow
                    key={stop.id}
                    stop={stop}
                    isLast={index === plan.stops.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: "/(driver)/job/[id]",
                        params: { id: stop.id }
                      })
                    }
                  />
                ))}
              </VStack>
            </ScrollView>
          )
        }
      </RequestView>
    </View>
  );
}

/** Whether the day still works, and what breaks first if it does not. */
function FeasibilityLine({
  feasible,
  tightestSlackMinutes
}: {
  feasible: boolean;
  tightestSlackMinutes?: number;
}) {
  const { t } = useTranslation();

  if (!feasible) {
    return (
      <Box className="rounded-pill bg-destructive-subtle px-3 py-1 self-start">
        <Text className="type-body-sm-bold text-destructive">{t("route.willNotFit")}</Text>
      </Box>
    );
  }
  if (tightestSlackMinutes === undefined) return null;

  /* Under half an hour of slack on a rural road is not really spare time — saying "fits" there
     would be technically true and practically misleading. */
  const tight = tightestSlackMinutes < 30;
  return (
    <Box
      className={`self-start rounded-pill px-3 py-1 ${tight ? "bg-warning-subtle" : "bg-success-subtle"}`}
    >
      <Text className={`type-body-sm-bold ${tight ? "text-warning" : "text-success"}`}>
        {t(tight ? "route.tight" : "route.fits", { minutes: tightestSlackMinutes })}
      </Text>
    </Box>
  );
}

/** One stop: its number, who and what, when it was promised, and how it is going. */
function RouteStopRow({
  stop,
  isLast,
  onPress
}: {
  stop: RouteStopView;
  isLast: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const crop = cropById(stop.cropId);
  const collected = stop.status === "in_transit" || stop.status === "delivered";
  const place = stop.town ? `${stop.town}, ${stop.district}` : stop.district;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("route.stopLabel", {
        position: stop.position,
        name: stop.farmerName,
        place
      })}
      testID={`route-stop-${stop.position}`}
      className="min-h-tap flex-row gap-3 py-2"
    >
      {/* The rail: a filled dot for a load already on the lorry, hollow for one still to collect,
          with the line continuing to the next stop. */}
      <VStack className="items-center">
        <Box
          className={`h-6 w-6 items-center justify-center rounded-pill ${
            collected ? "bg-primary" : "border-2 border-primary bg-card"
          }`}
        >
          <Text
            className={`type-body-sm-bold ${collected ? "text-primary-foreground" : "text-primary"}`}
          >
            {stop.position}
          </Text>
        </Box>
        {!isLast ? <Box className="w-0.5 flex-1 bg-border" /> : null}
      </VStack>

      <VStack className="flex-1 gap-0.5 pb-4">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {stop.farmerName} · {stop.quantityKg} kg {t(cropLabelKey(crop.id))}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {place}
          {stop.legMinutes > 0 ? ` · ${t("route.leg", { minutes: stop.legMinutes })}` : ""}
        </Text>

        <HStack className="mt-1 items-center gap-2">
          {stop.committedWindow ? (
            <Box className="rounded-pill bg-muted px-2.5 py-0.5">
              <Text className="type-body-sm text-muted-foreground">
                {formatMinutesOfDay(stop.committedWindow.from)} –{" "}
                {formatMinutesOfDay(stop.committedWindow.to)}
              </Text>
            </Box>
          ) : null}

          {/* Negative slack is the farmer who is about to be let down — it needs to be the loudest
              thing on the row, not a subtle colour change. */}
          {stop.slackMinutes !== undefined && stop.slackMinutes < 0 ? (
            <Box className="rounded-pill bg-destructive-subtle px-2.5 py-0.5">
              <Text className="type-body-sm-bold text-destructive">
                {t("route.late", { minutes: Math.abs(stop.slackMinutes) })}
              </Text>
            </Box>
          ) : null}

          {collected ? (
            <Text className="type-body-sm text-success">{t("route.collected")}</Text>
          ) : null}
        </HStack>
      </VStack>
    </Pressable>
  );
}

/** 185 → "3 h 05 m", as the design writes it. */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} m`;
  return `${h} h ${String(m).padStart(2, "0")} m`;
}
