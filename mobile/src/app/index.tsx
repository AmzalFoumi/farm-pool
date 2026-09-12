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
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { LeafIcon, LoginIcon, MailIcon, PlusIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/** Sinhala and Tamil are written in their own scripts deliberately — a speaker
 *  scanning for their language should not have to read English to find it. */
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" }
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<LanguageCode>("en");

  return (
    <View className="flex-1 bg-brand-deep">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <VStack className="flex-1 justify-end px-7 pb-26" style={{ paddingTop: insets.top }}>
        <Box className="h-16 w-16 items-center justify-center rounded-tile bg-card">
          <LeafIcon />
        </Box>

        <Text className="type-display mt-4.5 text-brand-deep-foreground">FarmPool</Text>

        <Text className="type-body-lg mt-5.5 text-brand-deep-muted">
          Farm produce, straight from the field to wholesale buyers.
        </Text>
      </VStack>

      {/* ── Sheet ────────────────────────────────────────────────────── */}
      <VStack
        className="gap-3.5 rounded-t-sheet bg-card px-5 pt-6.5"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Language picker. Each chip is min-h-tap and flex-1 so all three are
            the same width and none is harder to hit than its neighbours. */}
        <HStack className="gap-2" accessibilityRole="radiogroup">
          {LANGUAGES.map(({ code, label }) => {
            const selected = language === code;
            return (
              <Pressable
                key={code}
                onPress={() => setLanguage(code)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
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

        <AppButton label="Sign up" icon={<PlusIcon />} onPress={() => router.push("/sign-up-as")} />

        {/* TODO(FARM-?): no log-in screen exists yet, so this is inert. It is
            left visible because the design shows it and removing it would make
            the screen read as sign-up-only, which is not the intent. */}
        <AppButton label="Log in" variant="outline" icon={<LoginIcon />} />

        <HStack className="mt-0.5 items-center gap-2.5">
          <MailIcon />
          <Text className="type-caption text-muted-foreground">
            Need help? Call your area coordinator
          </Text>
        </HStack>
      </VStack>
    </View>
  );
}
