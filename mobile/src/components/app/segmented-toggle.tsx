/**
 * A segmented toggle: one track, N equal segments, and a single moving pill behind the active one.
 *
 * WHY A SLIDING PILL RATHER THAN N INDEPENDENT CHIPS. Three chips that each light up on their own
 * read as three separate switches, and nothing on screen says only one can be on. One pill that
 * travels says it: the thing that marks "selected" is singular, so selecting elsewhere has to move
 * it. The motion is doing work, not decorating.
 *
 * THE CURVE. This is an on-screen morph — the pill is already on screen and changes position — so
 * it takes an ease-in-out rather than the ease-out an entrance would use: it accelerates away and
 * settles, the way a physical switch does. 240ms with `cubic-bezier(.645, .045, .355, 1)`. No
 * bounce: a language picker is a statement of fact, not a celebration.
 *
 * REDUCED MOTION. The pill jumps instead of travelling. The selected state is carried by the pill's
 * position and the label's colour, both of which survive the jump, so nothing is lost.
 *
 * ACCESSIBILITY. The track is a `radiogroup` and each segment a `radio`, because this is one choice
 * among several and not a set of tabs over content. Each segment clears `min-h-tap`.
 */

import { useEffect, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

/** `--ease-in-out-cubic`. Named here because the design system has no motion tokens yet. */
const EASE_IN_OUT_CUBIC = Easing.bezier(0.645, 0.045, 0.355, 1);
const DURATION = 240;

/**
 * The `p-0.5` on the track, in points. The pill is inset by it, so the maths needs the number.
 *
 * This is the only height the control has to give. A segment is `min-h-tap` and that is a floor,
 * not a preference — so the track is 48 plus this twice, and 2 is as thin as the inset goes before
 * the pill touches the track edge and the track stops reading as one.
 */
const TRACK_PADDING = 2;

export type Segment<T extends string> = {
  value: T;
  /** What is drawn. For languages this is in its own script. */
  label: string;
  /** What a screen reader says, when the visible label is not it. */
  accessibilityLabel?: string;
  /** A handle for an end-to-end test. The label is in three scripts, so it cannot be the hook. */
  testID?: string;
};

type SegmentedToggleProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedToggle<T extends string>({
  segments,
  value,
  onChange
}: SegmentedToggleProps<T>) {
  const reduceMotion = useReducedMotion();

  /* The track is laid out by flex, so its width is only known after measurement. Everything the
     pill needs is derived from it rather than from an assumed screen width. */
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / segments.length : 0;

  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value)
  );
  const offset = useSharedValue(0);

  useEffect(() => {
    const next = index * segmentWidth;
    /* The first paint after measurement must not animate — the pill would slide in from the left
       edge on every cold start, which reads as a loading state rather than a choice being made. */
    if (reduceMotion || offset.value === 0) {
      offset.value = next;
      return;
    }
    offset.value = withTiming(next, { duration: DURATION, easing: EASE_IN_OUT_CUBIC });
  }, [index, segmentWidth, offset, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }]
  }));

  return (
    <Animated.View
      accessibilityRole="radiogroup"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      className="relative flex-row rounded-chip bg-muted p-0.5"
    >
      {/* Behind the labels, not between them: the pill is a background and must never catch a tap
          meant for the segment it is sitting under. */}
      <Animated.View
        pointerEvents="none"
        style={[
          pillStyle,
          { width: segmentWidth, opacity: segmentWidth > 0 ? 1 : 0 },
          { position: "absolute", top: TRACK_PADDING, bottom: TRACK_PADDING, left: TRACK_PADDING }
        ]}
        /* `bg-card`, which is white in light mode — the same surface as the sheet the control sits
           in, lifted off the muted track. `elevation-card` because white on near-white needs the
           shadow to hold its edge; without it the pill dissolves into the track. */
        className="elevation-card rounded-chip bg-card"
      />

      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            {...(segment.testID ? { testID: segment.testID } : {})}
            className="min-h-tap flex-1 items-center justify-center rounded-chip"
          >
            <Text
              className={`type-body-bold ${
                selected ? "text-card-foreground" : "text-muted-foreground"
              }`}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}
