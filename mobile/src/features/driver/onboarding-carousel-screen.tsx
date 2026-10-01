import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
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
 * and Skip/Next already does that — a swipe would be an undiscoverable second way to do the same
 * thing. Both buttons are on the slide, so there is nothing hidden.
 *
 * The slide itself owns the transition and the fixed sheet height, so this screen only tracks
 * which index is showing — see `components/onboarding/onboarding-slide.tsx`.
 */
const SLIDES = [
  {
    art: <OneJobOneRouteArt />,
    title: "One job, one route",
    body: "A buyer books several farmers at once. You get it as a single job with the pickups already in the best order, and the drop at the end."
  },
  {
    art: <ScanAtTheDropArt />,
    title: "Scan at the drop, money moves",
    body: "At each depot you scan the buyer's code. That confirms the delivery, releases the farmers' payment, and books your trip fee. No paperwork."
  },
  {
    art: <WeakSignalArt />,
    title: "Weak signal is fine",
    body: "Your route, pickups and scans are saved on the phone. They sync on their own when you pass through network."
  }
];

export function OnboardingCarouselScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const start = () => router.push("/driver-sign-up");

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <OnboardingSlide
        art={slide.art}
        title={slide.title}
        body={slide.body}
        index={index}
        count={SLIDES.length}
        actions={
          last ? (
            <AppButton label="Create my account" onPress={start} />
          ) : (
            <HStack className="gap-2.5">
              {/* Skip goes where Next eventually goes, rather than out of the flow: a driver
                  who does not want the explanation still wants the account. */}
              <Pressable
                onPress={start}
                accessibilityRole="button"
                accessibilityLabel="Skip the introduction"
                className="h-control items-center justify-center rounded-field border border-border bg-card px-6"
              >
                <Text className="type-h4 text-muted-foreground">Skip</Text>
              </Pressable>
              <View className="flex-1">
                <AppButton label="Next" onPress={() => setIndex((i) => i + 1)} />
              </View>
            </HStack>
          )
        }
      />
    </View>
  );
}
