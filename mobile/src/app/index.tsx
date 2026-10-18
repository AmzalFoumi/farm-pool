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
 * absolutely positioned so it takes the hero's box without being able to push the sheet.
 * The tagline it displaced moved into the sheet, under a heading — words over footage would
 * have needed a heavier scrim than the clip can take.
 */

import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames } from "uniwind";

import { AppButton } from "@/components/app/app-button";
import { PlusIcon, SparkleIcon, WordmarkIcon } from "@/components/app/icons";
import { SegmentedToggle } from "@/components/app/segmented-toggle";
import { StoryVideo } from "@/components/app/story-video";
import { Box } from "@/components/ui/box";
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
  /* Same reason as the wordmark: an SvgXml takes a colour value, not a className. */
  const tileIconColor = useResolveClassNames("text-icon-tile-foreground").color as string;

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
        {/* What the sheet is for, before the controls in it. The hero carries the brand and the
            clip but says nothing in words — someone who opens the app for the first time needs one
            line telling them what it is, and it belongs here rather than over the footage, where
            the scrim would have to get heavier to make it legible.

            `rounded-tile` is the token that exists for exactly this — the logo tile squircle,
            not a card — and `icon-tile` is a new token rather than a hex at the call site: the
            glyph is the normal near-black foreground and the tile behind it is barely off white,
            so the mark carries and the tile stays quiet. */}
        <VStack className="gap-3">
          <Box className="h-14 w-14 items-center justify-center rounded-tile bg-icon-tile">
            <SparkleIcon color={tileIconColor} />
          </Box>
          <VStack className="gap-1">
            <Text className="type-h3 text-foreground">{t("welcome.title")}</Text>
            {/* `welcome.tagline` came back: it was the line under the wordmark before the clip
                replaced it, it is already translated in all three languages, and it says exactly
                what this section needs to say. */}
            <Text className="type-body text-muted-foreground">{t("welcome.tagline")}</Text>
          </VStack>
        </VStack>

        {/* Language picker. One track with a pill that travels, rather than three chips that each
            light up: only one language can be on, and a single moving marker is what says so.
            Each label is in its own script — see `lib/i18n/languages.ts`. The screen reader gets
            the English endonym too, so a user whose reader has no Sinhala voice still hears which
            segment is which. */}
        <SegmentedToggle
          segments={LANGUAGES.map(({ code, label, endonym }) => ({
            value: code,
            label,
            accessibilityLabel: endonym
          }))}
          value={language}
          onChange={setLanguage}
        />

        <AppButton
          label={t("common.signUp")}
          icon={<PlusIcon />}
          onPress={() => router.push("/sign-up-as")}
        />

        {/* Log in is a text link, not a second button. Two full-width buttons of equal weight make
            the screen ask a question it does not mean to ask: signing up is what this screen is
            for, and logging in is the way back for someone who already has an account. The row
            still clears `min-h-tap` — demoting it visually must not demote it as a target. */}
        <Pressable
          onPress={() => router.push("/log-in")}
          accessibilityRole="button"
          className="min-h-tap items-center justify-center"
        >
          <Text className="type-body-bold text-primary">{t("common.logIn")}</Text>
        </Pressable>
      </VStack>
    </View>
  );
}
