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
  /** `solid` is the single primary action; `outline` is its alternative; `destructive` is dangerous actions. */
  variant?: "solid" | "outline" | "destructive";
  /** Rendered to the left of the label at its exported size. */
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function AppButton({
  label,
  onPress,
  variant = "solid",
  icon,
  disabled = false,
  className = ""
}: AppButtonProps) {
  const solid = variant === "solid";
  const destructive = variant === "destructive";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={[
        "h-control w-full flex-row items-center justify-center rounded-field",
        solid ? "bg-primary" : destructive ? "bg-destructive" : "border border-brand-deep bg-card",
        "active:opacity-80",
        disabled && "opacity-40",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <HStack className="items-center gap-2.5">
        {icon}
        <Text
          className={`type-h4 ${
            solid || destructive ? "text-primary-foreground" : "text-brand-deep"
          }`}
        >
          {label}
        </Text>
      </HStack>
    </Pressable>
  );
}
