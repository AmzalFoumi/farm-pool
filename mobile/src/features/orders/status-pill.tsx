import type { OrderStatus, WantedStatus } from "@farm-pool/shared";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

/**
 * Status → colour, per CLAUDE.md rule 5: `warning` is pending, `info` is moving, `success` is
 * done, `destructive` is cancelled or declined. One table so a farmer and a buyer never see the
 * same state in different colours.
 */
const ORDER: Record<OrderStatus, { label: string; tone: string }> = {
  requested: { label: "Requested", tone: "warning" },
  accepted: { label: "Accepted", tone: "info" },
  declined: { label: "Declined", tone: "destructive" },
  cancelled: { label: "Cancelled", tone: "destructive" },
  open: { label: "Open", tone: "info" },
  assigned: { label: "Driver assigned", tone: "info" },
  in_transit: { label: "In transit", tone: "info" },
  delivered: { label: "Delivered", tone: "success" }
};

const WANTED: Record<WantedStatus, { label: string; tone: string }> = {
  open: { label: "Open", tone: "warning" },
  closed: { label: "Closed", tone: "muted" }
};

/* Written out in full so UniWind can see every class name at build time. */
const TONE: Record<string, { box: string; text: string }> = {
  warning: { box: "bg-warning-subtle", text: "text-warning" },
  info: { box: "bg-info-subtle", text: "text-info" },
  success: { box: "bg-success-subtle", text: "text-success" },
  destructive: { box: "bg-destructive-subtle", text: "text-destructive" },
  muted: { box: "bg-muted", text: "text-muted-foreground" }
};

function Pill({ label, tone }: { label: string; tone: string }) {
  const t = TONE[tone] ?? TONE.muted;
  return (
    <Box className={`rounded-pill px-3 py-1 ${t.box}`}>
      <Text className={`type-body-sm-bold ${t.text}`}>{label}</Text>
    </Box>
  );
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Pill {...ORDER[status]} />;
}

export function WantedStatusPill({ status }: { status: WantedStatus }) {
  return <Pill {...WANTED[status]} />;
}

export function orderStatusLabel(status: OrderStatus) {
  return ORDER[status].label;
}
