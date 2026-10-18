/**
 * One stop, in the sheet, with the map behind it already moved to that gate.
 *
 * It answers only what a driver asks while the lorry is moving: who, what, where, by when, and is
 * this one in trouble. Everything that needs the farmer's phone number or a confirm button lives
 * on the job screen, which the button at the bottom opens — those actions have consequences and
 * belong on a screen the driver arrived at deliberately, not one a sideways swipe can reach.
 *
 * Nothing here is fetched. Every field is already on the planned stop, so opening a stop costs no
 * request and works on the same stale data the run was drawn from — which on a rural road with no
 * signal is the difference between a usable screen and a spinner.
 */

import { cropById, formatMinutesOfDay, type RouteStopView } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView } from "react-native";

import { AppButton } from "@/components/app/app-button";
import { BackIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DetailRow } from "@/features/driver/components/profile/detail-row";
import { OrderStatusPill } from "@/features/orders/status-pill";

export function RouteStopDetail({
  stop,
  count,
  onBack,
  onOpenJob,
  bottomInset
}: {
  stop: RouteStopView;
  /** How many stops the run has, so the heading can place this one in it. */
  count: number;
  onBack: () => void;
  onOpenJob: () => void;
  bottomInset: number;
}) {
  const { t } = useTranslation();
  const crop = cropById(stop.cropId);
  const place = stop.town ? `${stop.town}, ${stop.district}` : stop.district;
  const late = stop.slackMinutes !== undefined && stop.slackMinutes < 0;

  /* Coordinates, not a place name: this is the gate the planner routed to, and no search string
     would find it. Same hand-off as everywhere else — the installed maps app does the routing. */
  const navigate = () =>
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
        `&destination=${stop.point.latitude},${stop.point.longitude}`
    );

  return (
    <VStack className="flex-1">
      {/* The back control sits inside the sheet, not on an app bar: the sheet is what moved, so
          the way back belongs to it. */}
      <HStack className="items-center gap-1 px-gutter pb-1">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("route.backLabel")}
          testID="route-stop-back"
          className="-ml-2 h-tap w-tap items-center justify-center"
        >
          <BackIcon />
        </Pressable>
        <Text className="type-body-bold text-muted-foreground">
          {t("route.stopOf", { position: stop.position, count })}
        </Text>
      </HStack>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-gutter pt-1"
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      >
        <VStack className="gap-1">
          <HStack className="items-center justify-between gap-3">
            <Text className="type-h3 flex-1 text-foreground" numberOfLines={2}>
              {crop.emoji} {t("common.kg", { count: stop.quantityKg })} {crop.name}
            </Text>
            <OrderStatusPill status={stop.status} />
          </HStack>
          <Text className="type-body text-muted-foreground">
            {t("route.collectFrom", { name: stop.farmerName })} · {place}
          </Text>
        </VStack>

        {/* The one thing that is not a fact about the load but a warning about the day. Loud, and
            above the detail rows, because a driver who reads nothing else must read this. */}
        {late ? (
          <Box className="self-start rounded-pill bg-destructive-subtle px-3 py-1">
            <Text className="type-body-sm-bold text-destructive">
              {t("route.late", { minutes: Math.abs(stop.slackMinutes ?? 0) })}
            </Text>
          </Box>
        ) : null}

        <VStack className="gap-3 rounded-card border border-border bg-background p-4">
          {stop.committedWindow ? (
            <>
              <DetailRow
                label={t("jobs.window.committed")}
                value={`${formatMinutesOfDay(stop.committedWindow.from)} – ${formatMinutesOfDay(
                  stop.committedWindow.to
                )}`}
              />
              <Box className="h-px bg-border" />
            </>
          ) : null}

          <DetailRow label={t("route.arrival")} value={formatMinutesOfDay(stop.arrivalMinutes)} />

          {stop.legMinutes > 0 ? (
            <>
              <Box className="h-px bg-border" />
              <DetailRow
                label={t("route.fromLast")}
                value={t("route.minutes", { minutes: stop.legMinutes })}
              />
            </>
          ) : null}

          {stop.slackMinutes !== undefined && !late ? (
            <>
              <Box className="h-px bg-border" />
              <DetailRow
                label={t("route.slack")}
                value={t("route.minutes", { minutes: stop.slackMinutes })}
              />
            </>
          ) : null}
        </VStack>

        <VStack className="gap-2">
          <AppButton label={t("route.openJob")} onPress={onOpenJob} testID="route-open-job" />
          <AppButton label={t("route.navigate")} variant="outline" onPress={navigate} />
        </VStack>
      </ScrollView>
    </VStack>
  );
}
