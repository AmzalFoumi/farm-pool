import type { ReactNode } from "react";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * One of the squares across the top of the profile.
 *
 * Only for things that exist. A grid is easy to pad with plausible
 * labels — Earnings, Support, Rewards — and every padded one is a dead tap that teaches the
 * driver the screen is decorative.
 *
 * The whole square is the target, not the icon, per CLAUDE.md rule 4: this is used one-handed,
 * outdoors, by someone with dirt on their hands.
 */
export function ProfileTile({
  label,
  value,
  icon,
  onPress
}: {
  label: string;
  /** A count or a short state, when there is one worth seeing at a glance. */
  value?: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="min-h-tap flex-1 items-center justify-center gap-1.5 rounded-card border border-border bg-card px-2 py-4 active:opacity-80"
    >
      {/* On a tinted square, because the exported icons are drawn `stroke="white"` for the dark
          role-picker tiles and are invisible on a white card. CLAUDE.md rule 7 says do not redraw
          a Figma glyph, so the background moves to meet the icon rather than the other way. */}
      <Box className="h-10 w-10 items-center justify-center rounded-card bg-brand-deep">{icon}</Box>
      <VStack className="items-center">
        <Text className="type-body-sm-bold text-center text-foreground" numberOfLines={1}>
          {label}
        </Text>
        {value ? (
          <Text className="type-body-sm text-center text-muted-foreground" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </VStack>
    </Pressable>
  );
}
