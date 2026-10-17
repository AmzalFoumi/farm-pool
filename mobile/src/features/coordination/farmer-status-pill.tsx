import type { AccountStatus } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

/** Same "status → tone" table as `features/orders/status-pill.tsx`, for a farmer's account
 *  status: `warning` is pending, `success` is verified, `destructive` is suspended. */
const STATUS: Record<AccountStatus, { labelKey: string; box: string; text: string }> = {
  active: { labelKey: "farmerStatus.verified", box: "bg-success-subtle", text: "text-success" },
  pending_review: {
    labelKey: "farmerStatus.pending",
    box: "bg-warning-subtle",
    text: "text-warning"
  },
  suspended: {
    labelKey: "farmerStatus.suspended",
    box: "bg-destructive-subtle",
    text: "text-destructive"
  }
};

export function FarmerStatusPill({ status }: { status: AccountStatus }) {
  const { t } = useTranslation();
  const s = STATUS[status];
  return (
    <Box className={`rounded-pill px-3 py-1 ${s.box}`}>
      <Text className={`type-body-sm-bold ${s.text}`}>{t(s.labelKey)}</Text>
    </Box>
  );
}
