import type {
  CallStatus,
  DriverVerification,
  ListingStatus,
  OfferStatus,
  OrderStatus,
  PaymentStatus,
  WantedStatus
} from "@farm-pool/shared";

import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";

/**
 * Status → colour, per CLAUDE.md rule 5: `warning` is pending, `info` is moving, `success` is
 * done, `destructive` is cancelled or declined. One table so a farmer and a buyer never see the
 * same state in different colours.
 */
const ORDER: Record<OrderStatus, { labelKey: string; tone: string }> = {
  requested: { labelKey: "orderStatus.requested", tone: "warning" },
  accepted: { labelKey: "orderStatus.accepted", tone: "info" },
  declined: { labelKey: "orderStatus.declined", tone: "destructive" },
  cancelled: { labelKey: "orderStatus.cancelled", tone: "destructive" },
  open: { labelKey: "orderStatus.open", tone: "info" },
  assigned: { labelKey: "orderStatus.assigned", tone: "info" },
  in_transit: { labelKey: "orderStatus.in_transit", tone: "info" },
  delivered: { labelKey: "orderStatus.delivered", tone: "success" }
};

const WANTED: Record<WantedStatus, { labelKey: string; tone: string }> = {
  open: { labelKey: "wantedStatus.open", tone: "warning" },
  closed: { labelKey: "wantedStatus.closed", tone: "muted" }
};

/* A negotiation (FARM-46). Still being talked about is `warning`, like everything waiting on
   someone; agreed is `success`; declined is `destructive`; lapsed is history, so `muted`. */
const OFFER: Record<OfferStatus, { labelKey: string; tone: string }> = {
  PENDING: { labelKey: "offerStatus.PENDING", tone: "warning" },
  NEGOTIATING: { labelKey: "offerStatus.NEGOTIATING", tone: "warning" },
  ACCEPTED: { labelKey: "offerStatus.ACCEPTED", tone: "success" },
  DECLINED: { labelKey: "offerStatus.DECLINED", tone: "destructive" },
  EXPIRED: { labelKey: "offerStatus.EXPIRED", tone: "muted" }
};

/* A farmer's own listing. Pending approval waits on the coordinator, so it is `warning`;
   approved and live is `success`; a rejection is `destructive`. */
const LISTING: Record<ListingStatus, { labelKey: string; tone: string }> = {
  draft: { labelKey: "listingStatus.draft", tone: "muted" },
  pending_approval: { labelKey: "listingStatus.pending_approval", tone: "warning" },
  verified: { labelKey: "listingStatus.verified", tone: "success" },
  paused: { labelKey: "listingStatus.paused", tone: "muted" },
  rejected: { labelKey: "listingStatus.rejected", tone: "destructive" },
  sold: { labelKey: "listingStatus.sold", tone: "muted" }
};

/* A video call. Waiting on the farmer is `warning`, like a requested order; accepted and ready
   to join is `success`; declined is `destructive`; a finished call is history, so `muted`. */
const CALL: Record<CallStatus, { labelKey: string; tone: string }> = {
  requested: { labelKey: "callStatus.requested", tone: "warning" },
  active: { labelKey: "callStatus.active", tone: "success" },
  declined: { labelKey: "callStatus.declined", tone: "destructive" },
  ended: { labelKey: "callStatus.ended", tone: "muted" }
};

/* A delivery partner's vehicle check (FARM-45). Waiting on a check is `warning`, like every other
   thing waiting on someone; checked is `success`; refused is `destructive`. */
const DRIVER: Record<DriverVerification, { labelKey: string; tone: string }> = {
  pending: { labelKey: "verification.pending", tone: "warning" },
  verified: { labelKey: "verification.verified", tone: "success" },
  rejected: { labelKey: "verification.rejected", tone: "destructive" }
};

/* The money on an order (FARM-41). Held is `info`, like an order on the move: nothing is wrong
   and nothing is finished. Paid out in full is `success`. */
const PAYMENT: Record<PaymentStatus, { labelKey: string; tone: string }> = {
  in_escrow: { labelKey: "paymentStatus.in_escrow", tone: "info" },
  released: { labelKey: "paymentStatus.released", tone: "success" }
};

/* Written out in full so UniWind can see every class name at build time. */
const TONE: Record<string, { box: string; text: string }> = {
  warning: { box: "bg-warning-subtle", text: "text-warning" },
  info: { box: "bg-info-subtle", text: "text-info" },
  success: { box: "bg-success-subtle", text: "text-success" },
  destructive: { box: "bg-destructive-subtle", text: "text-destructive" },
  muted: { box: "bg-muted", text: "text-muted-foreground" }
};

function Pill({ labelKey, tone }: { labelKey: string; tone: string }) {
  const { t } = useTranslation();
  /* `styles`, not `t` — that name belongs to the translator now. */
  const styles = TONE[tone] ?? TONE.muted;
  return (
    <Box className={`rounded-pill px-3 py-1 ${styles.box}`}>
      <Text className={`type-body-sm-bold ${styles.text}`}>{t(labelKey)}</Text>
    </Box>
  );
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Pill {...ORDER[status]} />;
}

export function WantedStatusPill({ status }: { status: WantedStatus }) {
  return <Pill {...WANTED[status]} />;
}

export function OfferStatusPill({ status }: { status: OfferStatus }) {
  return <Pill {...OFFER[status]} />;
}

export function ListingStatusPill({ status }: { status: ListingStatus }) {
  return <Pill {...LISTING[status]} />;
}

export function CallStatusPill({ status }: { status: CallStatus }) {
  return <Pill {...CALL[status]} />;
}

export function DriverVerificationPill({ status }: { status: DriverVerification }) {
  return <Pill {...DRIVER[status]} />;
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <Pill {...PAYMENT[status]} />;
}

/** The key for an order's status label, for callers that need the words outside a pill. */
export function orderStatusLabelKey(status: OrderStatus) {
  return ORDER[status].labelKey;
}
