/**
 * The launch animation: on the logo green, the wordmark draws itself (`AnimatedWordmark`, the
 * designer's `farmpool-logo-animated.svg`), holds, then fades to reveal the app.
 *
 * The native splash (`app.json`, expo-splash-screen) is the same green with no image, so the
 * hand-off from it to this overlay is invisible — this is the animation's empty first frame.
 *
 * The designer's video (`assets/brand/launch-animation-reference.mp4`) holds the finished logo
 * for ~3 s; here it is 0.5 s, because nobody waits three seconds to open an app they use every
 * day. With "reduce motion" on, the wordmark appears whole and the overlay fades straight away.
 */

import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { AnimatedWordmark } from "@/components/app/animated-wordmark";

const HOLD_MS = 500;
const FADE_MS = 400;

export function LaunchAnimation() {
  const [visible, setVisible] = useState(true);
  const [started, setStarted] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const opacity = useSharedValue(1);

  /* The overlay is on screen and identical to the native splash, so that can go — and only
     then does the drawing start, or its first half would play under the splash. */
  useEffect(() => {
    SplashScreen.hideAsync().finally(() => setStarted(true));
  }, []);

  const fadeOut = useCallback(() => {
    opacity.set(
      withDelay(
        HOLD_MS,
        withTiming(0, { duration: FADE_MS }, (finished) => {
          "worklet";
          if (finished) scheduleOnRN(setVisible, false);
        })
      )
    );
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-0 z-50 items-center justify-center bg-leaf-400"
      style={fadeStyle}
    >
      {started && <AnimatedWordmark width={Math.min(screenWidth * 0.72, 320)} onDrawn={fadeOut} />}
    </Animated.View>
  );
}
