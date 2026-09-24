import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { BackIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { HelpCircleIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | "review";

/* Written out in full so UniWind can see every class name at build time. */
const PROGRESS: Record<WizardStep, string> = {
  1: "w-1/5",
  2: "w-2/5",
  3: "w-3/5",
  4: "w-4/5",
  5: "w-full",
  review: "w-full"
};

type WizardShellProps = {
  step: WizardStep;
  title: string;
  onBack?: () => void;
  /** Shown inline under the header when the help button is tapped. Inline rather than an
   *  `Alert`, because `Alert.alert` does nothing on web. */
  help?: string;
  /** The pinned bottom bar's content, usually `<WizardActions />`. */
  footer: ReactNode;
  /** Modals and sheets: rendered outside the scroll view. */
  overlay?: ReactNode;
  children: ReactNode;
};

/**
 * The frame every create-listing step shares: back button, step label, title, help and progress
 * at the top; a scrolling body; a pinned action bar at the bottom. One copy, so the six steps
 * cannot drift, and both edges take their inset from `useSafeAreaInsets()` (CLAUDE.md rule 8),
 * so the header clears the notch and the buttons clear the home indicator.
 */
export function WizardShell({
  step,
  title,
  onBack,
  help,
  footer,
  overlay,
  children
}: WizardShellProps) {
  const insets = useSafeAreaInsets();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <VStack className="gap-3 border-b border-border bg-card px-gutter pb-3 pt-2">
        <HStack className="items-center justify-between gap-2">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-tap w-tap items-center justify-center rounded-field border border-border bg-card"
          >
            <BackIcon />
          </Pressable>

          <VStack className="flex-1 items-center">
            <Text className="type-body-sm-bold text-muted-foreground">
              {step === "review" ? "Final check" : `Step ${step} of 5`}
            </Text>
            <Text className="type-title text-center text-foreground">{title}</Text>
          </VStack>

          {help ? (
            <Pressable
              onPress={() => setShowHelp((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showHelp ? "Hide help" : "Help"}
              accessibilityState={{ expanded: showHelp }}
              className="h-tap w-tap items-center justify-center rounded-field bg-secondary"
            >
              <Icon as={HelpCircleIcon} className="text-secondary-foreground" />
            </Pressable>
          ) : (
            <Box className="w-tap" />
          )}
        </HStack>

        <Box className="h-1.5 w-full overflow-hidden rounded-pill bg-muted">
          <Box className={`h-full rounded-pill bg-brand-deep ${PROGRESS[step]}`} />
        </Box>

        {help && showHelp ? (
          <Text className="type-caption text-muted-foreground">{help}</Text>
        ) : null}
      </VStack>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 p-gutter"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {overlay}

      <VStack
        className="gap-2 border-t border-border bg-card p-gutter"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {footer}
      </VStack>
    </View>
  );
}

type WizardActionsProps = {
  onBack?: () => void;
  backLabel?: string;
  continueLabel: string;
  onContinue: () => void;
  continueDisabled?: boolean;
};

/** Back (outline, one third) beside the step's primary action. */
export function WizardActions({
  onBack,
  backLabel = "Back",
  continueLabel,
  onContinue,
  continueDisabled
}: WizardActionsProps) {
  return (
    <HStack className="gap-2">
      <View className="w-1/3">
        <AppButton label={backLabel} variant="outline" onPress={onBack} />
      </View>
      <View className="flex-1">
        <AppButton label={continueLabel} disabled={continueDisabled} onPress={onContinue} />
      </View>
    </HStack>
  );
}
