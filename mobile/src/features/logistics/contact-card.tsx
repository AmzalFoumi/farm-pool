import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * Someone to call about a job, with the number as the tap target.
 *
 * This is the whole of "connecting each other" for now: a driver who cannot find a farm gate
 * dials from the job rather than leaving the app to search for a number (LP-71), and a farmer
 * does the same. In-app job messaging is LP-70 and out of scope.
 *
 * `tel:` is used rather than the calls feature deliberately — the video call runs on Agora, which
 * only exists in a development build, and a driver standing at a junction with no signal for
 * video still has a phone that makes calls.
 */
export function ContactCard({
  heading,
  name,
  phone,
  meta,
  note
}: {
  heading: string;
  name: string;
  phone: string;
  /** The line under the name — a place for a farmer, a vehicle for a driver. */
  meta?: string;
  /** Free text from the listing: gate directions, landmarks. */
  note?: string;
}) {
  const { t } = useTranslation();
  return (
    <VStack className="gap-2.5">
      <Text className="type-body-bold text-foreground">{heading}</Text>

      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <VStack className="gap-0.5">
          <Text className="type-body-bold text-foreground">{name}</Text>
          {meta ? <Text className="type-caption text-muted-foreground">{meta}</Text> : null}
        </VStack>

        <Box className="h-px bg-border" />

        <Pressable
          onPress={() => void Linking.openURL(`tel:${phone}`)}
          accessibilityRole="button"
          accessibilityLabel={`${name} · ${phone}`}
          className="min-h-tap justify-center"
        >
          <HStack className="items-center justify-between gap-3">
            <Text className="type-body text-muted-foreground">{t("common.phone")}</Text>
            <Text className="type-body-bold text-primary">{phone}</Text>
          </HStack>
        </Pressable>

        {note ? (
          <>
            <Box className="h-px bg-border" />
            <VStack className="gap-0.5">
              <Text className="type-body text-muted-foreground">{t("jobs.detail.finding")}</Text>
              <Text className="type-body text-foreground">{note}</Text>
            </VStack>
          </>
        ) : null}
      </VStack>
    </VStack>
  );
}
