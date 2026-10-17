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
 *   - the green hero takes the remaining height, with the wordmark at its top left
 * On a taller screen the hero grows and the sheet stays put, which is what the
 * design intends. On a shorter one the hero shrinks first.
 *
 * The hero is now a story clip behind a scrim, with the wordmark over it. The clip is
 * absolutely positioned so it takes the hero's box without being able to push the sheet;
 * the tagline it replaced is gone (its `welcome.tagline` key is still in the locale files).
 */

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames } from "uniwind";

import { AppButton } from "@/components/app/app-button";
import { LoginIcon, MailIcon, PlusIcon, WordmarkIcon } from "@/components/app/icons";
import { StoryVideo } from "@/components/app/story-video";
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
  /* The wordmark is an SVG, so it takes a colour value rather than a className; resolving the
     token keeps it on the design system. */
  const wordmarkColor = useResolveClassNames("text-brand-deep-foreground").color as string;

  return (
    <View className="flex-1 bg-brand-deep">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <View className="flex-1">
        {/* The story clip fills the hero edge to edge, behind the wordmark. Decorative and muted:
            it sets the scene while the language chips below are read, and carries nothing a user
            has to act on. Out of the layout flow, so it can never push the sheet: the hero is
            what gives way on a short screen. */}
        <StoryVideo fill />

        {/* Scrim — `brand-deep` through the alpha syntax `colors.css` is written for, not a new
            colour. It is here because the clip is pale: unscrimmed, the white wordmark measured
            about 2:1 against it, and the white lorry passes straight through. 30% is a
            deliberate trade: it keeps the clip's own colour, which is the point of showing it,
            and does not reach the 3:1 that large text wants. See DECISIONS.md. */}
        <Box className="absolute inset-0 bg-brand-deep/30" />

        <VStack className="flex-1 items-start px-7" style={{ paddingTop: insets.top + 20 }}>
          {/* The brand wordmark (assets/brand/) replaced the leaf tile and the typed name.
              Top-left over the clip: `items-start` keeps it its own width rather than letting the
              stack stretch it, and the stack no longer pushes to the bottom. */}
          <WordmarkIcon width={160} color={wordmarkColor} />
        </VStack>
      </View>

      {/* ── Sheet ────────────────────────────────────────────────────── */}
      {/* `-mt-7` is the 28px of `--radius-sheet`: the sheet rides that far up over the hero so
          its rounded top corners are cut out of the clip instead of showing the flat hero green
          behind them. A negative margin rather than bleeding the clip downward, because a child
          drawn outside its parent is clipped on Android and not on iOS. */}
      <VStack
        className="-mt-7 gap-3.5 rounded-t-sheet bg-card px-5 pt-6.5"
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
