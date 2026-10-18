import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/app/icons";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

type SettingsRowProps = {
  label: string;
  /** A second line under the label, when the label alone does not say enough. */
  note?: string;
  /**
   * The current answer, shown on the right before the chevron — the language in use, the plate on
   * file. A row that opens a screen to change something should say what it is set to now, or the
   * driver has to open it to find out, and half the time close it again.
   */
  value?: string;
  /** Replaces the chevron. For a row that toggles in place rather than opening a screen. */
  accessory?: ReactNode;
  onPress?: () => void;
  /** `destructive` for the one row that ends the session. */
  tone?: "default" | "destructive";
  testID?: string;
};

/**
 * One row in a settings card: a label, what it is currently set to, and the way in.
 *
 * `min-h-tap` on the row rather than on anything inside it, so the whole width is the target —
 * CLAUDE.md rule 4, and the reason the chevron is decoration rather than the button.
 *
 * A row with no `onPress` renders as text rather than a pressable, and drops the chevron with it:
 * an arrow on something that does not open is a promise the row cannot keep.
 */
export function SettingsRow({
  label,
  note,
  value,
  accessory,
  onPress,
  tone = "default",
  testID
}: SettingsRowProps) {
  const body = (
    <HStack className="min-h-tap items-center gap-3 px-4 py-3">
      <VStack className="flex-1 gap-0.5">
        <Text
          className={`type-body-bold ${
            tone === "destructive" ? "text-destructive" : "text-foreground"
          }`}
        >
          {label}
        </Text>
        {note ? <Text className="type-body-sm text-muted-foreground">{note}</Text> : null}
      </VStack>

      {value ? (
        <Text className="type-body text-muted-foreground" numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {accessory ?? (onPress ? <ChevronRightIcon /> : null)}
    </HStack>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      /* The value is part of what the row says, so a reader hears "Language, English" rather than
         "Language" and then an unannounced word somewhere to its right. */
      accessibilityLabel={value ? `${label}, ${value}` : label}
      {...(testID ? { testID } : {})}
      className="active:opacity-70"
    >
      {body}
    </Pressable>
  );
}
