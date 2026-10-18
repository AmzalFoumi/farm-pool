/**
 * Sign up as — role picker, reached from the welcome screen.
 * Figma node 196:5575.
 *
 * The Figma frame shows "Delivery partner" already selected, because a static
 * mock has to show the selected state somewhere. A real first visit has nothing
 * selected, so that is the initial state here and the footer button is disabled
 * until a role is picked. Its label is templated — Figma's "Continue as
 * delivery partner" is that template filled in with the mock's selection.
 *
 * All four roles are offered (decided 18 September 2026 — `.plans/auth/README.md`).
 * The Figma frame predates that and draws three. Each role's onboarding after
 * the account exists belongs to the developer owning that role — this screen and
 * `sign-up.tsx` only get the account created and the session started.
 *
 * THE CARDS NO LONGER FOLLOW THE FIGMA ANATOMY. Figma draws four 88px rows, each
 * an icon tile beside two lines of text inside a bordered white card on the off
 * white screen. They are now borderless `card-muted` cards on a white screen,
 * carrying a character illustration instead of an icon tile, dividing the full
 * height between them. The screen is a choice of four people, and a figure says
 * which one you are faster than a glyph does. `rolePicker.note` lost its line and
 * is unused — the cards say what they are.
 */

import type { Role } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResolveClassNames } from "uniwind";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { ArrowUpRightIcon, CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * A role card's look, not its words. Title and description are looked up per render from
 * `roles.<id>` and `rolePicker.<id>.description` (LP-91) — holding them in this module-level
 * constant would freeze them in whatever language the app started in, because the array is built
 * once at import and `setLanguage` does not re-run it.
 */
type RoleOption = {
  /** The shared `Role` this card creates. */
  id: Role;
  /**
   * The character illustration for this role. `require`d at module scope so Metro resolves it at
   * build time, and the files ship in the download rather than being fetched — a user picking a
   * role has an account to create next and should not be waiting on a network for a picture.
   * `assets/illustrations/README.md` says what each one is and how to replace it.
   */
  art: number;
};

const ROLES: readonly RoleOption[] = [
  { id: "farmer", art: require("../../assets/illustrations/role-farmer.png") },
  { id: "buyer", art: require("../../assets/illustrations/role-buyer.png") },
  { id: "coordinator", art: require("../../assets/illustrations/role-coordinator.png") },
  { id: "logistics", art: require("../../assets/illustrations/role-logistics.png") }
];

/** `--ease-out-quart`, the curve for something arriving. Named because there are no motion tokens. */
const EASE_OUT_QUART = Easing.bezier(0.165, 0.84, 0.44, 1);
const DURATION = 180;

/**
 * The card's corner mark: an arrow that becomes a tick.
 *
 * Both are mounted and cross-faded in place rather than swapped, because the swap was the thing
 * that looked wrong — one glyph vanishing and another appearing in the same 28px square reads as
 * a glitch, not as an answer to a tap. Fading one out as the other scales up says the mark
 * changed rather than that it was replaced.
 *
 * The scale is deliberately shallow (0.8, not 0) and the direction differs: the arrow shrinks as
 * it leaves, the tick grows as it arrives, so the two never look like the same object. 180ms with
 * an ease-out — this is feedback on a tap and anything slower lags behind the finger.
 */
function RoleAffordance({ selected, arrowColor }: { selected: boolean; arrowColor: string }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    const next = selected ? 1 : 0;
    progress.value = reduceMotion
      ? next
      : withTiming(next, { duration: DURATION, easing: EASE_OUT_QUART });
  }, [selected, progress, reduceMotion]);

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 - progress.value * 0.2 }]
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }]
  }));

  return (
    /* A fixed box the size of the larger of the two, with both stacked inside it. Laying them out
       on top of each other is what keeps the card's text from shifting as the mark changes. */
    <Box className="h-7 w-7 items-center justify-center">
      <Animated.View style={arrowStyle} className="absolute">
        <ArrowUpRightIcon color={arrowColor} />
      </Animated.View>
      <Animated.View
        style={checkStyle}
        className="absolute h-7 w-7 items-center justify-center rounded-pill bg-brand-deep"
      >
        <CheckIcon />
      </Animated.View>
    </Box>
  );
}

export default function SignUpAsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Role | null>(null);
  const { t } = useTranslation();

  const selectedRole = ROLES.find((role) => role.id === selected);
  /* An SvgXml takes a colour value, not a className — same as the wordmark on the welcome screen. */
  const arrowColor = useResolveClassNames("text-muted-foreground").color as string;

  return (
    <View className="flex-1 bg-card">
      {/* `plain`: no rule under the bar and no outline on the back button. The four tinted cards
          below already draw their own edges, and a ruled header over them was one box too many. */}
      <AppBar title={t("rolePicker.title")} variant="plain" />

      {/* ── Roles ────────────────────────────────────────────────────── */}
      {/* The four cards divide the screen between them rather than stacking at a fixed height:
          each is `flex-1`, so they grow and shrink together and the set always reaches the footer.
          That is what the illustrations need — a card tall enough to hold a figure — and it means
          the screen has no leftover space to explain away at the bottom. */}
      <VStack className="flex-1 gap-2.5 px-4 py-4" accessibilityRole="radiogroup">
        {ROLES.map(({ id, art }) => {
          const isSelected = selected === id;
          const title = t(`roles.${id}`);
          const description = t(`rolePicker.${id}.description`);
          return (
            <Pressable
              key={id}
              onPress={() => setSelected(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t("rolePicker.cardLabel", { title, description })}
              className={[
                "relative flex-1 flex-row items-center gap-3 overflow-hidden rounded-card py-2 pl-2 pr-4",
                /* No border, selected or not. Selection is a fill change instead: a border that
                   appears on selection grows inward and shifts everything in the card by its
                   width, and with four cards filling the screen that shift is visible. The mint
                   is `secondary`, the same "this one is chosen" surface the language picker
                   uses. */
                isSelected ? "bg-secondary" : "bg-card-muted"
              ].join(" ")}
            >
              {/* `contain`, not `cover`: these are figures, and cropping one at the chin to fill a
                  box is worse than letterboxing it. The column is a fixed share of the card so the
                  four titles start on the same x — a ragged left edge down the list reads as four
                  unrelated cards. */}
              <Image source={art} className="h-full w-24" resizeMode="contain" />

              {/* `pr-6` keeps the longest Sinhala title clear of the corner arrow. */}
              <VStack className="flex-1 gap-1.5 pr-6">
                <Text className="type-h4 text-foreground">{title}</Text>
                <Text className="type-caption text-muted-foreground">{description}</Text>
              </VStack>

              {/* Pinned to the corner, out of the flow, so the text block's height is the card's
                  and the mark never pushes a description onto another line. */}
              <Box className="absolute right-3 top-3">
                <RoleAffordance selected={isSelected} arrowColor={arrowColor} />
              </Box>
            </Pressable>
          );
        })}
      </VStack>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View
        className="border-t border-border bg-card px-4 pt-3"
        /* Figma leaves 23px under the button. On a device with a home
           indicator the inset already covers that and more, so take whichever
           is larger rather than stacking the two. */
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <AppButton
          label={
            selectedRole
              ? t("rolePicker.continueAs", { role: t(`roles.${selectedRole.id}`) })
              : t("common.continue")
          }
          disabled={!selectedRole}
          /* push, not replace: the back button on the form should return
             here so a wrong tap on a role is one step to undo.

             A delivery partner takes their own route: three explainer slides and a four-step
             wizard (Figma 196:6159 …), because a driver is deciding whether the work is worth
             owning a vehicle for, not just opening an account. The other three roles share the
             one-screen form. */
          onPress={() => {
            if (!selectedRole) return;
            if (selectedRole.id === "logistics") {
              router.push("/driver-onboarding");
              return;
            }
            router.push({ pathname: "/sign-up", params: { role: selectedRole.id } });
          }}
        />
      </View>
    </View>
  );
}
