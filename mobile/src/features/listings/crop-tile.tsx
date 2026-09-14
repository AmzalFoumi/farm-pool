import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

/**
 * Stand-in for a produce photo: the crop's emoji on a mint tile.
 *
 * The wireframe shows a photograph. There are no photos to show — listings are
 * fixtures — so rather than ship grey boxes this uses the emoji, which reads as
 * the crop at a glance and is honest about being a placeholder.
 *
 * The glyph is sized with a `type-*` class rather than a raw font size, so it
 * stays on the typography ramp (CLAUDE.md rule 3).
 */
export function CropTile({
  emoji,
  size = "sm"
}: {
  emoji: string;
  /** `sm` — the list row. `lg` — a grid card, fills the card's width. */
  size?: "sm" | "lg";
}) {
  return (
    <Box
      className={[
        "items-center justify-center rounded-card bg-secondary",
        size === "sm" ? "h-13 w-13" : "aspect-square w-full"
      ].join(" ")}
    >
      <Text className={size === "sm" ? "type-h4" : "type-h1"}>{emoji}</Text>
    </Box>
  );
}
