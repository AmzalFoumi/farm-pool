import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
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
 * and draws one continuous progress bar. This is a different header shape, and bending
 * `WizardShell` into both would put three booleans into a component six other screens already
 * depend on. So this is a second shell rather than a more configurable one.
 *
 * THE HEADER CARRIES NO TEXT. It was a back button, a "Delivery partner · step 1 of 4" label and
 * four full-width progress segments on a ruled bar. All of that said the same thing twice: the
 * step's own title is already the first thing in the body at `type-h2`, and the label repeated it
 * in smaller type. What is left is the back button, the progress, and nothing else — the progress
 * sits *in* the row rather than under it, so the header is one line high.
 *
 * **"Step 1 of 4" did not disappear, it stopped being drawn.** It is the progress bar's
 * `accessibilityLabel`, so a screen reader still announces exactly where the driver is. Dropping
 * a visible label is only safe when the information survives somewhere a reader can reach.
 *
 * WHITE THROUGHOUT, NO RULE UNDER THE BAR. The form fields are the off-white `card-muted`, so the
 * screen separates itself by what is a control and what is not, rather than by lines. The footer
 * keeps its rule: it is pinned over content that scrolls under it, and that edge is real.
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-card" style={{ paddingTop: insets.top }}>
      <HStack className="items-center px-4 pb-2 pt-2">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          className="h-tap w-tap items-center justify-center rounded-pill"
        >
          <BackIcon />
        </Pressable>

        {/* Centred on the row, which means balanced against the back button rather than against
            what is left of the row — hence the spacer. Same reason `AppBar`'s plain variant has
            one. */}
        <Box className="flex-1 items-center">
          <StepProgress step={step} />
        </Box>
        <Box className="h-tap w-tap" />
      </HStack>

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
 * Four marks: a dot per step, with the current one stretched into a pill.
 *
 * It was four full-width segments across the header. Discrete is still right — a driver counts
 * what is left more easily than they read a proportion — but at full width it was the loudest
 * thing on a screen whose job is a form. Shrunk to dots it says the same and takes a tenth of the
 * room, which is what lets it sit inside the header row instead of under it.
 *
 * Done and current share one colour. The distinction a driver needs is "behind me" against "ahead
 * of me", and the pill already says which one is now; giving done a third colour would be a
 * distinction without a use.
 *
 * Decorative in the visual sense only — it is the sole remaining statement of which step this is,
 * so it keeps the `progressbar` role and spells the step out for a screen reader. Compare
 * `SlideDots`, which is hidden, because there the slide's heading already says it.
 */
function StepProgress({ step }: { step: number }) {
  const { t } = useTranslation();
  return (
    <HStack
      className="items-center gap-1.5"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: SIGN_UP_STEPS, now: step }}
      accessibilityLabel={t("driverSignUp.stepLabel", { step, count: SIGN_UP_STEPS })}
    >
      {Array.from({ length: SIGN_UP_STEPS }, (_, i) => {
        const current = i === step - 1;
        const done = i < step - 1;
        return (
          <Box
            key={i}
            className={`h-1.5 rounded-pill ${current ? "w-6" : "w-1.5"} ${
              current || done ? "bg-primary" : "bg-border"
            }`}
          />
        );
      })}
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
