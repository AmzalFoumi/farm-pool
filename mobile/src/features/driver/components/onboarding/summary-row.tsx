import type { ComponentProps } from "react";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * One confirmed fact on the "Sent for checking" screen (Figma 196:6416, 196:6421, 196:6426).
 *
 * Read-only by design: the driver has just finished, and a row that looked tappable would invite
 * them back into a flow they have completed. `tone` separates what is already settled (`done` —
 * the number is verified, the vehicle is recorded) from what is still with someone else
 * (`pending` — the documents), so the screen does not imply the whole thing is approved.
 */
export function SummaryRow({
  icon,
  label,
  note,
  tone = "done"
}: {
  icon: ComponentProps<typeof Icon>["as"];
  label: string;
  /** Second line, when the row needs one — "Ranjan S · Dambulla area". */
  note?: string;
  tone?: "done" | "pending";
}) {
  const done = tone === "done";

  return (
    <HStack
      className={`items-center gap-3 rounded-card p-4 ${
        done ? "border border-border bg-card" : "bg-secondary"
      }`}
      accessibilityLabel={note ? `${label}. ${note}` : label}
    >
      <Box
        className={`h-7 w-7 items-center justify-center rounded-pill ${
          done ? "bg-success" : "bg-warning"
        }`}
      >
        <Icon as={icon} size="sm" className="text-primary-foreground" />
      </Box>

      <VStack className="flex-1 gap-0.5">
        <Text className="type-body text-foreground">{label}</Text>
        {note ? <Text className="type-body-sm text-muted-foreground">{note}</Text> : null}
      </VStack>
    </HStack>
  );
}
