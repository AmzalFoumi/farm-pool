import type { ReactNode } from "react";

import { Box } from "@/components/ui/box";
import { Icon, CheckCircleIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

/** `warning` for something pending action, `destructive` for a problem, `success` for a good
 *  outcome, `info` for a plain headcount. Shared by Region and Disputes so the two tab-shell
 *  dashboards read the same way.
 *
 *  `elevation-card` is tuned for a white card on the light-mode mist background (`layout.css`) —
 *  its shadow is nearly invisible on a dark surface, so it alone doesn't give a tile presence in
 *  dark mode. Paired here with a `border-{tone}` edge, the same `border-{tone} bg-{tone}-subtle`
 *  combination already used for the rejected-listing and out-of-benchmark cards elsewhere — a
 *  colour border stays legible against black regardless of theme, which a shadow cannot. */
const STAT_TONE = {
  info: { box: "border-info bg-info-subtle", text: "text-info" },
  success: { box: "border-success bg-success-subtle", text: "text-success" },
  warning: { box: "border-warning bg-warning-subtle", text: "text-warning" },
  destructive: { box: "border-destructive bg-destructive-subtle", text: "text-destructive" }
} as const;

export function StatCard({
  tone,
  value,
  label,
  onPress,
  icon,
  zeroLabel
}: {
  tone: keyof typeof STAT_TONE;
  value: number | string;
  label: string;
  onPress?: () => void;
  /** A small marker for the tile's category — a farmer silhouette, a leaf, a clock. Purely
   *  decorative, so a tile reads by shape before anyone reads the number underneath it. */
  icon?: ReactNode;
  /** Shown instead of a bare "0" when `value` is exactly 0 and reaching zero is the good
   *  outcome (an empty queue, no open disputes) — a flat digit undersells that, where a
   *  checkmark reads as reassurance. Only pass this where zero is genuinely good news; a
   *  headcount or a listing count hitting zero is not. */
  zeroLabel?: string;
}) {
  const { box, text } = STAT_TONE[tone];
  const className = `elevation-card min-h-tap flex-1 gap-1 rounded-card border p-3 ${box}`;
  const isGoodZero = zeroLabel !== undefined && value === 0;
  const accessibilityLabel = isGoodZero ? zeroLabel : `${value} ${label}`;
  const content = (
    <>
      {icon ? <Box className="mb-0.5">{icon}</Box> : null}
      {isGoodZero ? (
        <Icon as={CheckCircleIcon} className={text} size="lg" />
      ) : (
        <Text className={`type-h2 ${text}`}>{value}</Text>
      )}
      <Text className="type-caption text-muted-foreground">{isGoodZero ? zeroLabel : label}</Text>
    </>
  );

  /* A plain `Box`, not a `disabled` Pressable, when there's nowhere to go: every `Pressable` in
   *  this design system carries `data-[disabled=true]:opacity-40` in its base style (`ui/
   *  pressable`), so `disabled={!onPress}` was quietly rendering every non-tappable tile — every
   *  one of Disputes' — at 40% opacity. Region's tiles all pass `onPress`, so they never hit it;
   *  that mismatch was the entire "washed out" look, not a border or layout issue. */
  if (!onPress) {
    return (
      <Box accessibilityLabel={accessibilityLabel} className={className}>
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={className}
    >
      {content}
    </Pressable>
  );
}
