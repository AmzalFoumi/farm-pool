/**
 * The run, at a glance and then stop by stop — the sheet's first face (FARM-61, Figma 196:5906).
 *
 * This is what the old Route screen was in full; it now lives in the sheet over the map, which is
 * why it carries no app bar and no background of its own. The order is **planned on the api**, not
 * here — the same planner decides which jobs reach the board, and two answers to the same day
 * would be worse than none.
 */

import {
  cropById,
  formatMinutesOfDay,
  type DriverRoute,
  type RouteStopView
} from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { formatDuration } from "@/features/logistics/format-duration";

export function RouteOverview({
  plan,
  onSelectStop,
  bottomInset
}: {
  plan: DriverRoute;
  onSelectStop: (stop: RouteStopView) => void;
  bottomInset: number;
}) {
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-gutter pb-6 pt-2"
      contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
    >
      {/* The run at a glance, which is what the driver checks before setting off. */}
      <VStack className="gap-2">
        <HStack className="items-baseline gap-2">
          <Text className="type-h2 text-foreground">{formatDuration(plan.totalMinutes)}</Text>
          <Text className="type-body text-muted-foreground">
            {t("route.summary", { km: plan.totalKm, kg: plan.totalKg.toLocaleString() })}
          </Text>
        </HStack>

        <FeasibilityLine
          feasible={plan.feasible}
          tightestSlackMinutes={plan.tightestSlackMinutes}
        />

        {/* Said once, plainly: every number above is an estimate from straight-line distance. A
            driver quoting a fee from it should know that. */}
        <Text className="type-body-sm text-muted-foreground">{t("route.estimateNote")}</Text>
      </VStack>

      <VStack className="gap-0">
        {plan.stops.map((stop, index) => (
          <RouteStopRow
            key={stop.id}
            stop={stop}
            isLast={index === plan.stops.length - 1}
            onPress={() => onSelectStop(stop)}
          />
        ))}
      </VStack>
    </ScrollView>
  );
}

/** Whether the day still works, and what breaks first if it does not. */
export function FeasibilityLine({
  feasible,
  tightestSlackMinutes
}: {
  feasible: boolean;
  tightestSlackMinutes?: number;
}) {
  const { t } = useTranslation();

  if (!feasible) {
    return (
      <Box className="self-start rounded-pill bg-destructive-subtle px-3 py-1">
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
          {stop.farmerName} · {stop.quantityKg} kg {crop.name}
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
