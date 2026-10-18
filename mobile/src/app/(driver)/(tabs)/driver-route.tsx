/**
 * Route — the driver's day, in the order they agreed to do it (FARM-61, Figma 196:5906).
 *
 * **The first tab, and a map screen rather than a list screen.** Jobs answers "what work is
 * there"; this answers "what am I doing, and in what order", and the second is the one a driver
 * has open while the lorry is moving — so it is what the app opens on, and the map is the whole
 * screen with the run riding over its bottom half in a sheet.
 *
 * This file only decides *which* stop is in focus. The map takes that and moves the camera; the
 * sheet takes it and slides to that stop's face. Keeping the selection here is what lets the two
 * stay in step without either knowing about the other.
 *
 * The order is **planned on the api**, not here — the same planner decides which jobs reach the
 * board, and two answers to the same day would be worse than none.
 */

import type { RouteStopView } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { logisticsApi } from "@/features/logistics/api";
import { RouteMap } from "@/features/logistics/route-map";
import { RouteSheet } from "@/features/logistics/route-sheet";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

/**
 * How much of the screen the sheet covers.
 *
 * Half, capped: enough to read the summary and three stops without scrolling, and never so tall
 * on a large phone that the map stops being a map. The cap is what keeps the proportion right
 * across a 5" phone and a 6.7" one — a flat percentage gives the big screen a sheet the size of a
 * page.
 */
const SHEET_FRACTION = 0.52;
const SHEET_MAX = 460;

export default function DriverRouteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { token } = useAuth();

  const route = useRequest(() => logisticsApi.route(token ?? ""), token ?? "");

  /* The stop in focus, and whether its face is the one showing. Two values rather than one,
     because the detail has to stay drawn while it slides back out — clearing the stop on `back`
     would blank the pane mid-travel. */
  const [stop, setStop] = useState<RouteStopView | undefined>(undefined);
  const [showingStop, setShowingStop] = useState(false);

  const sheetHeight = Math.min(Math.round(height * SHEET_FRACTION), SHEET_MAX);

  const select = (next: RouteStopView) => {
    setStop(next);
    setShowingStop(true);
  };
  const back = useCallback(() => setShowingStop(false), []);

  /* Android's back button closes the stop before it leaves the tab. Anything else would make the
     hardware back do something different from the control two centimetres above it. */
  useFocusEffect(
    useCallback(() => {
      if (!showingStop) return;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        back();
        return true;
      });
      return () => subscription.remove();
    }, [showingStop, back])
  );

  /* Confirming a pickup on a job screen changes the run, so it has to refetch — but underneath,
     not by blanking. See the Jobs tab for why. */
  useFocusEffect(useReloadOnRefocus(route.silentRefresh));

  return (
    <View className="flex-1 bg-background">
      <RequestView request={route}>
        {(plan) =>
          plan.stops.length === 0 ? (
            <EmptyNote title={t("route.emptyTitle")} note={t("route.emptyBody")} />
          ) : (
            <>
              <RouteMap
                stops={plan.stops}
                selectedStopId={showingStop ? stop?.id : undefined}
                topInset={insets.top}
                obstructedBottom={sheetHeight}
              />

              <RouteSheet
                plan={plan}
                height={sheetHeight}
                stop={stop}
                selected={showingStop}
                onSelectStop={select}
                onBack={back}
                onOpenJob={(selected) =>
                  router.push({
                    pathname: "/(driver)/job/[id]",
                    params: { id: selected.id }
                  })
                }
                bottomInset={insets.bottom}
              />
            </>
          )
        }
      </RequestView>
    </View>
  );
}
