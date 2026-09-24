/**
 * The FarmPool primary/secondary button.
 *
 * WHY THIS EXISTS RATHER THAN gluestack's <Button>
 * gluestack's Button bakes `rounded-md`, `min-h-8`/`min-h-10` and `font-sans`
 * into its tva base. The design's button is 58px tall, `rounded-field` (14px)
 * and Poppins Bold 18 — so every one of those would have to be fought with an
 * override, and overriding a tva base is exactly where className merge order
 * stops being predictable. Building on gluestack's <Pressable> instead keeps
 * the focus-visible ring and disabled handling while letting the design system
 * own the appearance outright.
 *
 * Both variants are full-width by design: these are commitment buttons at the
 * bottom of a screen, not inline actions.
 */

import type { ReactNode } from "react";

import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  /** `solid` is the single primary action on a screen; `outline` is its alternative. */
  variant?: "solid" | "outline";
  /** Rendered to the left of the label at its exported size. */
  icon?: ReactNode;
  disabled?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = "solid",
  icon,
  disabled = false
}: AppButtonProps) {
  const solid = variant === "solid";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={[
        "h-control w-full flex-row items-center justify-center rounded-field",
        solid ? "bg-primary" : "border border-brand-deep bg-card",
        // Pressed feedback has to be opacity rather than a colour shift: these
        // buttons sit on three different surfaces across the two screens, and a
        // pressed-colour token would be wrong on at least one of them.
        "active:opacity-80",
        disabled && "opacity-40"
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <HStack className="items-center gap-2.5">
        {icon}
        {/* type-h4 is Poppins Bold 18/24 — the metrics Figma gives the button
            label. Named as a heading step rather than a button-specific token
            because there is no case where the two should diverge. */}
        <Text className={`type-h4 ${solid ? "text-primary-foreground" : "text-brand-deep"}`}>
          {label}
        </Text>
      </HStack>
    </Pressable>
  );
}
