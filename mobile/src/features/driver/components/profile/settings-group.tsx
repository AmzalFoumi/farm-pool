import type { ReactNode } from "react";
import { Children, Fragment } from "react";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * One card of settings rows, with a hairline between them.
 *
 * **The grouping is the organisation.** A profile that is one long list makes a driver read every
 * row to find the one they want; three short cards let them skip two of them. So a group is a
 * claim about what its rows have in common — the work they do, the app itself — and a row that
 * does not fit any group is a sign the group is wrong rather than a reason to add a fourth.
 *
 * The divider is drawn here and not by the row, because only the group knows which row is last and
 * a trailing rule inside a card is the commonest version of this done badly.
 */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  /* `Children.toArray` drops the `null`s a conditional row leaves behind, so a group whose last
     row is conditional does not end up with a divider under nothing. */
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;

  return (
    <VStack className="gap-2">
      {title ? (
        <Text className="type-body-sm-bold px-1 uppercase tracking-wide text-muted-foreground">
          {title}
        </Text>
      ) : null}

      <VStack className="overflow-hidden rounded-card bg-card-muted">
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <Box className="ml-4 h-px bg-border" /> : null}
            {row}
          </Fragment>
        ))}
      </VStack>
    </VStack>
  );
}
