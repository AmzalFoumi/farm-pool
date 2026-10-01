import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export const SIGN_UP_STEPS = 4;

/**
 * The frame the four sign-up steps share (Figma 196:6238, 196:6269, 196:6306, 196:6361).
 *
 * WHY NOT `WizardShell` — the listings/vehicle shell centres a title under a "Step n of m" label
 * and draws one continuous progress bar. This design is a different header: the label is the only
 * text in the bar, left-aligned beside the back button and reading "Delivery partner · step 1 of
 * 4", with progress as four discrete segments under it. The step's own title lives in the body,
 * at `type-h2`, where it can be two lines. Bending `WizardShell` into both shapes would put three
 * booleans into a component six other screens already depend on, so this is a second shell rather
 * than a more configurable one.
 *
 * Both edges take their inset from `useSafeAreaInsets()` (CLAUDE.md rule 8): the bar clears the
 * notch and the footer clears the home indicator.
 */
export function OnboardingShell({
  step,
  onBack,
  footer,
  children
}: {
  /** 1-based. Drives both the label and how many segments are filled. */
  step: number;
  onBack: () => void;
  /** The pinned bottom bar — one commitment button, on every step. */
  footer: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <VStack className="gap-3 border-b border-border bg-card px-4 pb-4 pt-2">
        <HStack className="items-center gap-3">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-tap w-tap items-center justify-center rounded-field border border-border bg-card"
          >
            <BackIcon />
          </Pressable>
          <Text className="type-title flex-1 text-foreground" numberOfLines={1}>
            Delivery partner · step {step} of {SIGN_UP_STEPS}
          </Text>
        </HStack>

        <StepProgress step={step} />
      </VStack>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-gutter pb-6 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-t border-border bg-card px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        {footer}
      </View>
    </View>
  );
}

/**
 * Four equal segments, filled up to the current step.
 *
 * Discrete rather than one filling bar because the design draws it that way, and because a driver
 * can count four things left to do more easily than they can read a proportion — the same reason
 * the label spells out "step 1 of 4" instead of showing a percentage.
 */
function StepProgress({ step }: { step: number }) {
  return (
    <HStack
      className="gap-1.5"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: SIGN_UP_STEPS, now: step }}
      accessibilityLabel={`Step ${step} of ${SIGN_UP_STEPS}`}
    >
      {Array.from({ length: SIGN_UP_STEPS }, (_, i) => (
        <Box
          key={i}
          className={`h-1.5 flex-1 rounded-pill ${i < step ? "bg-brand-deep" : "bg-muted"}`}
        />
      ))}
    </HStack>
  );
}

/** The title-and-subtitle pair every step opens with (Figma: `type-h2` over `type-body-lg`). */
export function StepHeading({ title, note }: { title: string; note: string }) {
  return (
    <VStack className="gap-2">
      <Text className="type-h2 text-foreground">{title}</Text>
      <Text className="type-body-lg text-muted-foreground">{note}</Text>
    </VStack>
  );
}
