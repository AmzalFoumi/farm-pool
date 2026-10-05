/**
 * Welcome — the first screen on app open.
 * Figma node 196:5544.
 *
 * LAYOUT NOTE
 * Figma positions everything absolutely inside a 393×852 frame. Reproducing
 * that literally would break on every other device size and ignore safe-area
 * insets, so the structure here is flex and only the *relationships* Figma
 * specifies are pinned:
 *   - the white sheet is content-height and sits at the bottom
 *   - the green hero takes the remaining height, with its text block 104px
 *     above the sheet (Figma: subtitle ends 328, sheet starts 432)
 * On a taller screen the hero grows and the sheet stays put, which is what the
 * design intends. On a shorter one the hero shrinks first.
 */

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { LeafIcon, LoginIcon, MailIcon, PlusIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { LANGUAGES } from "@/lib/i18n";
import { useLocale } from "@/providers/locale-provider";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /* The picker now sets the app's language for real (LP-91) and the choice is remembered, so a
     driver picks once. The chips are the first thing on the first screen precisely because
     everything after them is unreadable to someone who got the wrong one. */
  const { language, setLanguage } = useLocale();
  /* Translated last, but it matters most here: this is the screen the chips are on, so a tap on
     සිංහල that left this copy in English would say the switch had not worked. */
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-brand-deep">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <VStack className="flex-1 justify-end px-7 pb-26" style={{ paddingTop: insets.top }}>
        <Box className="h-16 w-16 items-center justify-center rounded-tile bg-card">
          <LeafIcon />
        </Box>

        <Text className="type-display mt-4.5 text-brand-deep-foreground">FarmPool</Text>

        <Text className="type-body-lg mt-5.5 text-brand-deep-muted">{t("welcome.tagline")}</Text>
      </VStack>

      {/* ── Sheet ────────────────────────────────────────────────────── */}
      <VStack
        className="gap-3.5 rounded-t-sheet bg-card px-5 pt-6.5"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Language picker. Each chip is min-h-tap and flex-1 so all three are
            the same width and none is harder to hit than its neighbours.
            Each label is in its own script — see `lib/i18n/languages.ts`. */}
        <HStack className="gap-2" accessibilityRole="radiogroup">
          {LANGUAGES.map(({ code, label, endonym }) => {
            const selected = language === code;
            return (
              <Pressable
                key={code}
                onPress={() => setLanguage(code)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                /* The visible label is in its own script; the screen reader gets the English
                   name too, so a user whose reader has no Sinhala voice still hears which
                   chip is which. */
                accessibilityLabel={endonym}
                className={[
                  "min-h-tap flex-1 items-center justify-center rounded-chip",
                  selected ? "bg-secondary" : "border border-border bg-card"
                ].join(" ")}
              >
                <Text
                  className={`type-body-bold ${
                    selected ? "text-secondary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </HStack>

        <AppButton
          label={t("common.signUp")}
          icon={<PlusIcon />}
          onPress={() => router.push("/sign-up-as")}
        />

        <AppButton
          label={t("common.logIn")}
          variant="outline"
          icon={<LoginIcon />}
          onPress={() => router.push("/log-in")}
        />

        <HStack className="mt-0.5 items-center gap-2.5">
          <MailIcon />
          <Text className="type-caption text-muted-foreground">{t("welcome.help")}</Text>
        </HStack>
      </VStack>
    </View>
  );
}
