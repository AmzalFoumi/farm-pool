import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { Box } from "@/components/ui/box";
import { CheckIcon, Icon, PaperclipIcon, PhoneIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { SummaryRow } from "./summary-row";

/**
 * "Sent for checking" (Figma 196:6409) — the end of sign-up.
 *
 * No app bar and no back button: the account exists, the documents are gone to the coordinator,
 * and there is nothing behind this screen worth returning to. The driver leaves forwards.
 *
 * The three rows are honest about what is and is not settled — the number and the vehicle are
 * `done`, the documents are `pending` with the coordinator — so nobody reads this as approval.
 * Verification is still `pending` on the account until someone moves it
 * (`docs/logistics-driver-role.md`, open question 3).
 */
export function StepDone({
  phone,
  vehicleLabel,
  registration,
  coordinator,
  onSeeJobs
}: {
  phone: string;
  vehicleLabel: string;
  registration: string;
  /** Who holds the documents, when the api can say. Falls back to the generic line. */
  coordinator?: string;
  onSeeJobs: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-gutter pb-6 pt-12">
        <Box className="h-22 w-22 items-center justify-center rounded-card bg-success-subtle">
          <Icon as={CheckIcon} className="h-11 w-11 text-success" />
        </Box>

        <VStack className="gap-3">
          <Text className="type-h1 text-foreground">Sent for checking</Text>
          <Text className="type-body-lg text-muted-foreground">
            Your area coordinator reviews your details, usually within one day. We SMS you when jobs
            open up.
          </Text>
        </VStack>

        <VStack className="gap-2.5">
          <SummaryRow icon={PhoneIcon} label={`Number verified · ${phone}`} />
          <SummaryRow icon={CheckIcon} label={`${vehicleLabel} · ${registration}`} />
          <SummaryRow
            icon={PaperclipIcon}
            tone="pending"
            label="Documents with coordinator"
            note={coordinator ?? "Waiting to be assigned"}
          />
        </VStack>
      </ScrollView>

      <View
        className="border-t border-border bg-card px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <AppButton label="See jobs near you" onPress={onSeeJobs} />
      </View>
    </View>
  );
}
