/**
 * The panel that rides over the bottom of the Route map, and the slide between its two faces.
 *
 * WHY A SLIDE AND NOT A PUSHED SCREEN. Tapping a stop does not take the driver anywhere — the map
 * behind the sheet stays, and moves to that stop. Navigating would cover the map with a second
 * screen and throw away the thing they tapped it to see. So the sheet keeps its frame and only
 * its contents travel: the run goes out to the left, the stop comes in from the right, exactly
 * the way a tab bar moves between two views of the same thing. Coming back reverses it, which is
 * what makes "back" mean "up a level" rather than "somewhere else".
 *
 * THE CURVE. An on-screen morph, so ease-in-out rather than the ease-out of an entrance, and the
 * same 240ms `cubic-bezier(.645, .045, .355, 1)` the segmented toggle uses — this is the same kind
 * of motion and there is no reason for two curves. The map camera is deliberately a little slower
 * (`CAMERA_MS`): the panel should land first, so the driver is reading the stop while the map
 * settles under it rather than watching two things race.
 *
 * REDUCED MOTION. The panes cut instead of sliding. Nothing is carried by the travel itself — the
 * back control and the heading both say where the driver is — so nothing is lost.
 */

import type { DriverRoute, RouteStopView } from "@farm-pool/shared";
import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { RouteOverview } from "@/features/logistics/route-overview";
import { RouteStopDetail } from "@/features/logistics/route-stop-detail";

/** `--ease-in-out-cubic`. Named here because the design system has no motion tokens yet. */
const EASE_IN_OUT_CUBIC = Easing.bezier(0.645, 0.045, 0.355, 1);
const DURATION = 240;

export function RouteSheet({
  plan,
  height,
  /** The stop whose face is showing. Kept mounted through the slide back out. */
  stop,
  selected,
  onSelectStop,
  onBack,
  onOpenJob,
  bottomInset
}: {
  plan: DriverRoute;
  height: number;
  stop?: RouteStopView;
  /** Whether the detail face is the one in view. Separate from `stop` so the pane can finish
   *  sliding away with its content still drawn. */
  selected: boolean;
  onSelectStop: (stop: RouteStopView) => void;
  onBack: () => void;
  onOpenJob: (stop: RouteStopView) => void;
  bottomInset: number;
}) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    const next = selected ? -width : 0;
    offset.value = reduceMotion
      ? next
      : withTiming(next, { duration: DURATION, easing: EASE_IN_OUT_CUBIC });
  }, [selected, width, offset, reduceMotion]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }]
  }));

  /* The run refetches underneath while a stop is open (a pickup confirmed elsewhere changes it),
     so the detail is read back out of the current plan rather than from the object that was
     tapped. Falls back to that object only when the stop has left the run entirely — which is
     what the pane is showing as it slides away. */
  const live = plan.stops.find((s) => s.id === stop?.id) ?? stop;

  return (
    <Box
      style={{ height }}
      /* Pinned to the bottom edge, so only the top corners are rounded — `--radius-sheet` is
         specified that way for a sheet that meets the screen edge. */
      className="elevation-card absolute inset-x-0 bottom-0 overflow-hidden rounded-t-sheet border-t border-border bg-card"
    >
      {/* The grabber. It does not drag — the sheet is a fixed height — but it is what says
          "panel over the map" rather than "the bottom of the page", which is the whole reason
          the map behind it reads as still being there. */}
      <View className="items-center pb-1 pt-2">
        <Box className="h-1 w-10 rounded-pill bg-border" />
      </View>

      <Animated.View style={[{ flexDirection: "row", width: width * 2, flex: 1 }, trackStyle]}>
        <Pane width={width} active={!selected}>
          <RouteOverview plan={plan} onSelectStop={onSelectStop} bottomInset={bottomInset} />
        </Pane>

        <Pane width={width} active={selected}>
          {live ? (
            <RouteStopDetail
              stop={live}
              count={plan.stops.length}
              onBack={onBack}
              onOpenJob={() => onOpenJob(live)}
              bottomInset={bottomInset}
            />
          ) : null}
        </Pane>
      </Animated.View>
    </Box>
  );
}

/**
 * One face of the sheet.
 *
 * The inactive one is held off both the accessibility tree and the touch handling — it is still
 * mounted and still a pane width away, and a screen reader walking into the run while the driver
 * is reading a stop would be reading something invisible.
 */
function Pane({
  width,
  active,
  children
}: {
  width: number;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{ width }}
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {children}
    </View>
  );
}
