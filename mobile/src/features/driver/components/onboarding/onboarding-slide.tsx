import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * One of the three carousel slides (Figma 196:6159, 196:6185, 196:6213).
 *
 * TWO THINGS THIS FILE IS RESPONSIBLE FOR, both of which are about the slide *not* moving:
 *
 * **The sheet is one component at one height.** Its three slides have titles of one and two
 * lines and bodies of three and four, so a content-height sheet grows and shrinks as you advance
 * and the Next button walks up and down the screen — under a thumb that is already resting on
 * it. The height is fixed once, here, and the text block flexes inside it, so the dots, the
 * button and the sheet edge are in identical positions on all three slides.
 *
 * **Only the content animates, never the frame.** The illustration and the text cross-fade and
 * slide; the sheet, the dots and the actions are static. Animating the frame as well would make
 * the one fixed thing on screen appear to move.
 *
 * The Figma frame is 393x852 with the sheet occupying its bottom 484px. Expressed per CLAUDE.md
 * rule 8 as a *proportion* rather than a constant, so the balance holds on any screen.
 *
 * The ratio is tighter than Figma's 484/852. At that height the sheet is mostly empty space
 * below the text on every slide, and the space is worth more to the illustration above it. The
 * floor is the tallest slide's actual content — 20 top pad, 48 for the dots row, 16 gap, 188 of
 * two-line heading plus four-line body, 16 gap, 58 button, 16 bottom pad — so the sheet can shrink
 * to exactly what the worst case needs and no further. Going below it clips text on slide 2.
 *
 * The dots row is 48 rather than the dots' own 6 because Skip sits in it now, and Skip is a tap
 * target: `min-h-tap` is a floor under every interactive element (CLAUDE.md rule 4), and a plain
 * word is no exception — it is the styling that changed, not what a thumb has to hit.
 *
 * **The sheet is rounded on all four corners, not just the top.** It is a card lying on the
 * screen rather than a panel welded to its bottom edge, which is what the shorter height makes it
 * — at 0.46 it reached far enough up to read as the lower half of the screen, and a bottom corner
 * on something that size looks like a mistake. `--radius-sheet` is the same 28 the welcome
 * screen's sheet uses, so the two read as one family. The screen's own safe-area padding is what
 * leaves the gap underneath for the bottom corners to show against.
 */
const SHEET_RATIO = 0.42;
const SHEET_MIN_HEIGHT = 362;

/** Long enough to read as motion, short enough not to delay a driver tapping through. */
const DURATION_MS = 260;

export function OnboardingSlide({
  art,
  title,
  body,
  index,
  count,
  actions,
  topRight
}: {
  art: ReactNode;
  title: string;
  body: string;
  /** Which slide is showing. Drives the dots and the direction of the transition. */
  index: number;
  count: number;
  /** Back + Next, or the commitment button on the last slide. Static: same height on
   *  every slide, so it never moves. */
  actions: ReactNode;
  /**
   * Sits opposite the dots at the top of the sheet. Skip lives here rather than over the
   * illustration: the panel above is a single flat colour behind a drawing, and a word floating on
   * it belongs to neither. In the sheet it is on the surface that holds every other control.
   */
  topRight?: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.max(SHEET_MIN_HEIGHT, Math.round(height * SHEET_RATIO));

  return (
    <View className="flex-1 bg-background">
      {/* `river-50` is the illustration panel's own colour. A brand ramp rather than a semantic
          token is correct here under CLAUDE.md rule 2: decorative colour behind an illustration,
          not a surface other content sits on. */}
      <View className="flex-1 items-center justify-center overflow-hidden bg-river-50">
        <Transition index={index}>{art}</Transition>
      </View>

      <VStack
        className="gap-4 rounded-sheet bg-card px-gutter pb-4 pt-5"
        style={{ height: sheetHeight }}
      >
        {/* `min-h-tap` on the row, not on Skip alone, so the dots stay vertically centred against
            it and the row is one height whether or not Skip is passed. */}
        <HStack className="min-h-tap items-center justify-between">
          <SlideDots count={count} index={index} />
          {topRight}
        </HStack>

        {/* `flex-1` is what pins the actions to the bottom of the sheet: the text takes the
            slack, so a shorter body leaves space below it rather than pulling the button up. */}
        <View className="flex-1">
          <Transition index={index}>
            <VStack className="gap-3">
              <Text className="type-h1 text-foreground">{title}</Text>
              <Text className="type-body-lg text-muted-foreground">{body}</Text>
            </VStack>
          </Transition>
        </View>

        {actions}
      </VStack>
    </View>
  );
}

/**
 * Fades and slides its children in whenever `index` changes, in the direction of travel.
 *
 * Only the incoming content is animated — there is no exit. An exit would mean keeping the old
 * slide mounted and cross-fading two illustrations, which costs a second SVG render on a low-end
 * phone for an effect nobody registers at this duration.
 *
 * Honours the OS "reduce motion" setting by switching instantly: a driver who has asked the
 * system for less movement should not get a slide on every tap.
 */
function Transition({ index, children }: { index: number; children: ReactNode }) {
  const progress = useSharedValue(1);
  const previous = useRef(index);
  const direction = useRef(1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (previous.current === index) return;
    direction.current = index > previous.current ? 1 : -1;
    previous.current = index;

    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) });
  }, [index, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * 28 * direction.current }]
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

/**
 * The three page dots. The current one is a wide pill rather than a bigger circle, as drawn.
 *
 * Decorative: the slide's heading already says where the driver is, and announcing "page 2 of 3"
 * as well is noise. Hidden from screen readers for that reason.
 */
export function SlideDots({ count, index }: { count: number; index: number }) {
  return (
    <HStack
      className="gap-1.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <Box
          key={i}
          className={`h-1.5 rounded-pill ${i === index ? "w-6 bg-primary" : "w-2 bg-border"}`}
        />
      ))}
    </HStack>
  );
}
