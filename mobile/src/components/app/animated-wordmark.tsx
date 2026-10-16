/**
 * The FarmPool wordmark drawing itself, stroke by stroke — the designer's
 * `assets/brand/farmpool-logo-animated.svg`, replayed with reanimated because React Native does
 * not run the CSS animation inside an SVG. Same paths, same per-stroke delays and durations, same
 * easing curve (see `wordmark-strokes.ts`).
 *
 * Used by the launch animation; reusable anywhere a branded wait fits (a full-screen load, an
 * empty first sync). `loop` redraws it until unmounted. With "reduce motion" on, it is drawn
 * whole and does not move, as the source SVG's own `prefers-reduced-motion` rule does.
 */

import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import Svg, { Defs, G, Mask, Path } from "react-native-svg";
import { useResolveClassNames } from "uniwind";

import { WORDMARK_RATIO } from "@/components/app/icons";
import {
  WORDMARK_STROKE_WIDTH,
  WORDMARK_STROKES,
  WORDMARK_VIEWBOX,
  type WordmarkStroke
} from "@/components/app/wordmark-strokes";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** When the last stroke finishes, in ms (≈2.06 s). */
export const WORDMARK_DRAW_MS = Math.max(...WORDMARK_STROKES.map((s) => s.delayMs + s.durationMs));
/** How long a looping wordmark rests, fully drawn, before it redraws. */
const LOOP_HOLD_MS = 800;

/* The source SVG's `cubic-bezier(0.65, 0, 0.25, 1)`. */
const ease = Easing.bezierFn(0.65, 0, 0.25, 1);

type Props = {
  width: number;
  /** A text-colour class for the letters. Defaults to white-on-brand. */
  colorClassName?: string;
  loop?: boolean;
  /** Called once the first draw has finished (immediately with reduce motion). */
  onDrawn?: () => void;
};

export function AnimatedWordmark({
  width,
  colorClassName = "text-brand-deep-foreground",
  loop = false,
  onDrawn
}: Props) {
  const color = useResolveClassNames(colorClassName).color as string;
  const reduceMotion = useReducedMotion();
  /* One clock, in ms since the draw began; every stroke reads its own window of it. */
  const clock = useSharedValue(reduceMotion ? WORDMARK_DRAW_MS : 0);

  useEffect(() => {
    if (reduceMotion) {
      clock.set(WORDMARK_DRAW_MS);
      onDrawn?.();
      return;
    }
    const draw = withTiming(WORDMARK_DRAW_MS, {
      duration: WORDMARK_DRAW_MS,
      easing: Easing.linear
    });
    clock.set(0);
    clock.set(
      loop
        ? withRepeat(
            withSequence(draw, withDelay(LOOP_HOLD_MS, withTiming(0, { duration: 0 }))),
            -1
          )
        : draw
    );
    const timer = onDrawn ? setTimeout(onDrawn, WORDMARK_DRAW_MS) : undefined;
    return () => {
      cancelAnimation(clock);
      if (timer) clearTimeout(timer);
    };
    // onDrawn is a one-shot notification; re-running the animation when its identity changes
    // would restart the draw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, loop, reduceMotion]);

  return (
    <Svg
      width={width}
      height={width * WORDMARK_RATIO}
      viewBox={WORDMARK_VIEWBOX}
      accessibilityRole="image"
      accessibilityLabel="FarmPool"
    >
      <Defs>
        {WORDMARK_STROKES.map((stroke, i) => (
          <Mask
            key={i}
            id={`wordmark-${i}`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="3987"
            height="1128"
          >
            <StrokeLine stroke={stroke} clock={clock} />
          </Mask>
        ))}
      </Defs>
      <G fill={color}>
        {WORDMARK_STROKES.map((stroke, i) => (
          <Path key={i} d={stroke.shape} mask={`url(#wordmark-${i})`} />
        ))}
      </G>
    </Svg>
  );
}

/** One mask line. White, because a mask shows what is under its light parts. */
function StrokeLine({ stroke, clock }: { stroke: WordmarkStroke; clock: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    const t = Math.min(Math.max((clock.value - stroke.delayMs) / stroke.durationMs, 0), 1);
    return { strokeDashoffset: stroke.length * (1 - ease(t)) };
  });
  return (
    <AnimatedPath
      d={stroke.stroke}
      fill="none"
      stroke="white"
      strokeWidth={WORDMARK_STROKE_WIDTH}
      strokeDasharray={[stroke.length, stroke.length]}
      animatedProps={animatedProps}
    />
  );
}
