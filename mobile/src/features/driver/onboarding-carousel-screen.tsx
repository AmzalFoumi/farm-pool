import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { BackIcon } from "@/components/app/icons";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

import {
  OneJobOneRouteArt,
  ScanAtTheDropArt,
  WeakSignalArt
} from "./components/onboarding/illustrations";
import { OnboardingSlide } from "./components/onboarding/onboarding-slide";

/**
 * What a delivery partner is told before they sign up (Figma 196:6159, 196:6185, 196:6213).
 *
 * Three slides, each answering the objection the research recorded from the logistics provider:
 * trips are wasted (so: one job, one route), payment is slow and opaque (so: scan at the drop),
 * and the network drops in exactly the areas they drive through (so: it works offline).
 *
 * Advanced by button rather than by swipe. A `FlatList` pager would be the richer control, but
 * every element here has to clear a 48dp tap target for a one-handed driver (CLAUDE.md rule 4),
 * and Back/Next already does that — a swipe would be an undiscoverable second way to do the same
 * thing. Every control is on the slide, so there is nothing hidden.
 *
 * Three controls, ranked by what they do: Next commits and is the filled button, Back steps and is
 * an outlined arrow beside it, Skip abandons the explanation and is a word in the corner. They
 * were all buttons once, which made the screen ask three questions of equal weight.
 *
 * The slide itself owns the transition and the fixed sheet height, so this screen only tracks
 * which index is showing — see `components/onboarding/onboarding-slide.tsx`.
 */
const SLIDES = [
  { art: <OneJobOneRouteArt />, key: "slide1" },
  { art: <ScanAtTheDropArt />, key: "slide2" },
  { art: <WeakSignalArt />, key: "slide3" }
] as const;

export function OnboardingCarouselScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const start = () => router.push("/driver-sign-up");

  return (
    /* The floor is 16 rather than 8 because the sheet is rounded on its bottom corners now, and
       a 28px radius needs something to curve away from. On a phone with a home indicator the
       inset is already larger and wins. */
    <View className="flex-1 bg-background" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
      <OnboardingSlide
        art={slide.art}
        title={t(`driverOnboarding.${slide.key}.title`)}
        body={t(`driverOnboarding.${slide.key}.body`)}
        index={index}
        count={SLIDES.length}
        /* Skip is a word, not a button. It is the one thing on the screen that undoes the
           screen, and dressing it as a control put it in competition with Next, which is what
           the slides are actually asking the driver to press. It is still `min-h-tap` — see the
           slide's dots row. Hidden on the last slide: there is nothing left to skip. */
        topRight={
          last ? null : (
            <Pressable
              onPress={start}
              accessibilityRole="button"
              accessibilityLabel={t("driverOnboarding.skipIntro")}
              className="min-h-tap justify-center pl-4"
            >
              <Text className="type-body-bold text-muted-foreground">{t("common.skip")}</Text>
            </Pressable>
          )
        }
        actions={
          <HStack className="gap-2.5">
            {/* Back takes the slot Skip used to hold, and is on every slide including the last:
                the row keeps one shape, so nothing moves as the driver advances. On the first
                slide there is no previous slide, so it leaves the carousel the way they came —
                which is what a back arrow means to the person pressing it either way. */}
            <Pressable
              onPress={() => (index === 0 ? router.back() : setIndex((i) => i - 1))}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              className="h-control items-center justify-center rounded-field border border-border bg-card px-5"
            >
              <BackIcon />
            </Pressable>
            <View className="flex-1">
              {last ? (
                <AppButton label={t("driverOnboarding.createAccount")} onPress={start} />
              ) : (
                <AppButton label={t("common.next")} onPress={() => setIndex((i) => i + 1)} />
              )}
            </View>
          </HStack>
        }
      />
    </View>
  );
}
