import type { DriverVerification } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { SparkleIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * The one card on the profile that is not a list: where the driver's check stands, and the way to
 * act on it.
 *
 * **Why this is the prominent card.** A promotion-shaped slot wants the thing a driver most needs
 * to know and might not have gone looking for, and for a delivery partner that is their
 * verification — it decides what a farmer sees at the gate, and `pending` is the state almost
 * everyone is in (`packages/shared/src/identity/driver.ts`: only `pending` is ever written today).
 * The alternative was an invented upsell; FarmPool has nothing to sell a driver, and a card
 * promising one would be the dead tap this screen's own comments warn about.
 *
 * `brand-deep` because it is a surface, not an action (CLAUDE.md rule 5) — the same green panel
 * the welcome hero uses, so the loudest thing on the profile is still brand rather than alarm.
 * Even `rejected` stays on it: the row is bad news, not a destructive action, and `destructive` is
 * reserved for cancelling and deleting.
 */
export function VerificationCard({
  status,
  onPress
}: {
  status: DriverVerification;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t(`profile.verificationHeading.${status}`)}. ${t(
        `profile.verification.${status}`
      )}`}
      className="rounded-card bg-brand-deep p-4 active:opacity-90"
    >
      <HStack className="items-start gap-3.5">
        <Box className="h-10 w-10 items-center justify-center rounded-card bg-brand-deep-foreground/15">
          <SparkleIcon color="#ffffff" />
        </Box>

        <VStack className="flex-1 gap-1.5">
          <Text className="type-h4 text-brand-deep-foreground">
            {t(`profile.verificationHeading.${status}`)}
          </Text>
          {/* The body lines already existed for the old inline pill note, and say exactly what a
              driver needs: what a farmer sees, and what to do about it. */}
          <Text className="type-body-sm text-brand-deep-muted">
            {t(`profile.verification.${status}`)}
          </Text>

          <Box className="mt-2 self-start rounded-pill bg-brand-deep-foreground px-4 py-2">
            <Text className="type-body-sm-bold text-brand-deep">
              {t(`profile.verificationAction.${status}`)}
            </Text>
          </Box>
        </VStack>
      </HStack>
    </Pressable>
  );
}
