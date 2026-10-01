import NotoSansBold from "@/assets/fonts/NotoSans-Bold.ttf";
import NotoSansRegular from "@/assets/fonts/NotoSans-Regular.ttf";
import NotoSansSinhalaBold from "@/assets/fonts/NotoSansSinhala-Bold.ttf";
import NotoSansSinhalaRegular from "@/assets/fonts/NotoSansSinhala-Regular.ttf";
import NotoSansTamilBold from "@/assets/fonts/NotoSansTamil-Bold.ttf";
import NotoSansTamilRegular from "@/assets/fonts/NotoSansTamil-Regular.ttf";

import type { LanguageCode } from "./languages";

/**
 * One typeface system across three scripts (LP-91).
 *
 * WHY POPPINS AND MULISH WERE REPLACED: neither contains a single Sinhala or Tamil glyph — I
 * checked the shipped TTFs, 471 and 936 glyphs, none of them in either block. Every translated
 * string would render as tofu. Noto is the realistic family group with Latin, Sinhala and Tamil
 * drawn to the same design language and metrics, so the app looks like one app in all three
 * languages rather than three different apps.
 *
 * WHY THE FILES ARE VENDORED AND SUBSET: upstream the six faces are 1,860 KB, most of it Noto
 * Sans Latin carrying Cyrillic, Greek and Vietnamese. `mobile/scripts/subset-fonts.py` cuts them
 * to the three scripts this app renders — 607 KB, against the 368 KB of Poppins and Mulish they
 * replace. +239 KB for three languages, on a connection the product doc calls out as the binding
 * constraint. Re-run that script after bumping an `@expo-google-fonts` package.
 *
 * WHY ONE SCRIPT FACE SERVES A WHOLE SCREEN: every subset keeps full ASCII, so "Rs 180 · 40 kg"
 * inside a Sinhala sentence renders from the Sinhala face. React Native takes one `fontFamily`
 * per `Text` and has no fallback chain, so this property is what makes the approach work at all.
 */
export const FONT_ASSETS = {
  NotoSans_400Regular: NotoSansRegular,
  NotoSans_700Bold: NotoSansBold,
  NotoSansSinhala_400Regular: NotoSansSinhalaRegular,
  NotoSansSinhala_700Bold: NotoSansSinhalaBold,
  NotoSansTamil_400Regular: NotoSansTamilRegular,
  NotoSansTamil_700Bold: NotoSansTamilBold
} as const;

type FacePair = { regular: string; bold: string };

const FACES: Record<LanguageCode, FacePair> = {
  en: { regular: "NotoSans_400Regular", bold: "NotoSans_700Bold" },
  si: { regular: "NotoSansSinhala_400Regular", bold: "NotoSansSinhala_700Bold" },
  ta: { regular: "NotoSansTamil_400Regular", bold: "NotoSansTamil_700Bold" }
};

/**
 * Which `type-*` steps are set in the bold face.
 *
 * `typography.css` already encodes this — every heading step names the bold face and the body
 * steps have explicit `-bold` counterparts — but a `className` string is all the `Text`
 * component gets at runtime, so the same fact has to be readable from it. Kept as one regex next
 * to the table it mirrors rather than spread through the components.
 */
const BOLD_STEP = /\btype-(display|h1|h2|h3|h4|title)\b|-bold\b/;

/**
 * The face a `Text` should use, or `null` when the stylesheet already has it right.
 *
 * English needs no override at all: `typography.css` names the Latin faces directly, so the
 * common case costs nothing. Sinhala and Tamil return a family that the `Text` component applies
 * over the class, because a CSS custom property cannot be swapped at runtime in React Native.
 */
export function fontOverride(language: LanguageCode, className?: string): string | null {
  if (language === "en") return null;
  const face = FACES[language];
  return BOLD_STEP.test(className ?? "") ? face.bold : face.regular;
}
