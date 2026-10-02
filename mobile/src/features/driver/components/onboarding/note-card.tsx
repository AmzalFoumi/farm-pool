import type { ComponentProps } from "react";

import { HStack } from "@/components/ui/hstack";
import { Icon, InfoIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/**
 * The quiet explanatory box under a field (Figma 196:6257, 196:6399).
 *
 * `bg-secondary` rather than a bordered card: it is reassurance, not a warning, and a border
 * would give it the same weight as the field it is explaining. The icon is decorative — the
 * sentence carries the whole meaning — so it is hidden from screen readers rather than read out
 * before every note.
 */
export function NoteCard({
  children,
  icon = InfoIcon
}: {
  children: string;
  icon?: ComponentProps<typeof Icon>["as"];
}) {
  return (
    /* The icon is decorative — the sentence carries the whole meaning — so the row is collapsed
       into a single label rather than letting a screen reader stop on the glyph first. */
    <HStack
      className="items-start gap-3 rounded-card bg-secondary p-3.5"
      accessibilityLabel={children}
    >
      <Icon as={icon} className="mt-0.5 text-secondary-foreground" />
      <Text className="type-caption flex-1 text-secondary-foreground">{children}</Text>
    </HStack>
  );
}
