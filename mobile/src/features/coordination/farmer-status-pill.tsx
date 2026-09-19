import type { AccountStatus } from "@farm-pool/shared";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

/** Same "status → tone" table as `features/orders/status-pill.tsx`, for a farmer's account
 *  status: `warning` is pending, `success` is verified, `destructive` is suspended. */
const STATUS: Record<AccountStatus, { label: string; box: string; text: string }> = {
  active: { label: "Verified", box: "bg-success-subtle", text: "text-success" },
  pending_review: { label: "Pending", box: "bg-warning-subtle", text: "text-warning" },
  suspended: { label: "Suspended", box: "bg-destructive-subtle", text: "text-destructive" }
};

export function FarmerStatusPill({ status }: { status: AccountStatus }) {
  const s = STATUS[status];
  return (
    <Box className={`rounded-pill px-3 py-1 ${s.box}`}>
      <Text className={`type-body-sm-bold ${s.text}`}>{s.label}</Text>
    </Box>
  );
}
