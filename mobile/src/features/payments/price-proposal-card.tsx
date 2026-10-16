import {
  RENEGOTIABLE_ORDER_STATUSES,
  proposePriceSchema,
  type Order,
  type PriceProposal
} from "@farm-pool/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { paymentsApi } from "@/features/payments/api";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/**
 * Renegotiating the price before pickup (FARM-53), on the order screen.
 *
 * One of three things, or nothing:
 * - a proposal from the other side, with Accept and Decline
 * - the viewer's own proposal, waiting, with Withdraw
 * - a way to make one, while the price may still change
 *
 * After pickup it renders nothing: the deal is being carried out, and the api refuses a new
 * price from there on.
 */
export function PriceProposalCard({
  order,
  viewer,
  token,
  onChanged
}: {
  order: Order;
  viewer: "buyer" | "farmer";
  token: string;
  onChanged: () => void;
}) {
  if (order.priceProposal) {
    return (
      <OpenProposal
        order={order}
        proposal={order.priceProposal}
        viewer={viewer}
        token={token}
        onChanged={onChanged}
      />
    );
  }
  if (!RENEGOTIABLE_ORDER_STATUSES.includes(order.status)) return null;
  return <ProposeForm order={order} token={token} onChanged={onChanged} />;
}

function OpenProposal({
  order,
  proposal,
  viewer,
  token,
  onChanged
}: {
  order: Order;
  proposal: PriceProposal;
  viewer: "buyer" | "farmer";
  token: string;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = proposal.proposedBy === viewer;
  const other =
    proposal.proposedBy === "farmer" ? order.farmerName : t("payments.proposal.theBuyer");
  const newTotal = order.quantityKg * proposal.pricePerKg;

  const answer = async (send: (token: string, orderId: string) => Promise<Order>) => {
    setBusy(true);
    setError(null);
    try {
      await send(token, order.id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("payments.proposal.answerError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <VStack className="gap-2.5">
      <Text className="type-body-bold text-foreground">{t("payments.proposal.proposed")}</Text>
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <Text className="type-body-lg text-foreground">
          {mine ? "You" : other} proposed {formatPrice(proposal.pricePerKg)} / kg instead of{" "}
          {formatPrice(order.pricePerKg)} / kg.
        </Text>
        <Text className="type-body text-muted-foreground">
          The total would change from {formatPrice(order.total)} to {formatPrice(newTotal)}.
        </Text>
        {proposal.reason ? (
          <Text className="type-body text-muted-foreground">Reason: {proposal.reason}</Text>
        ) : null}

        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

        {mine ? (
          <>
            <Text className="type-caption text-muted-foreground">
              {t("payments.proposal.waiting")}
            </Text>
            <AppButton
              label={busy ? "Withdrawing…" : t("payments.proposal.withdraw")}
              variant="outline"
              onPress={() => void answer(paymentsApi.declinePrice)}
              disabled={busy}
            />
          </>
        ) : (
          <>
            <AppButton
              label={busy ? "Sending…" : `Accept ${formatPrice(proposal.pricePerKg)} / kg`}
              onPress={() => void answer(paymentsApi.acceptPrice)}
              disabled={busy}
            />
            <AppButton
              label={t("common.decline")}
              variant="outline"
              onPress={() => void answer(paymentsApi.declinePrice)}
              disabled={busy}
            />
          </>
        )}
      </VStack>
    </VStack>
  );
}

function ProposeForm({
  order,
  token,
  onChanged
}: {
  order: Order;
  token: string;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="min-h-tap justify-center active:opacity-80"
      >
        <Text className="type-body-bold text-primary">{t("payments.proposal.cta")}</Text>
      </Pressable>
    );
  }

  const submit = async () => {
    setError(null);
    const parsed = proposePriceSchema.safeParse({
      pricePerKg: Number(price),
      ...(reason.trim() ? { reason } : {})
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a price");
      return;
    }
    setSubmitting(true);
    try {
      await paymentsApi.proposePrice(token, order.id, parsed.data);
      onChanged();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? (e.fieldMessage("pricePerKg") ?? e.message)
          : t("payments.proposal.sendError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <VStack className="gap-2.5">
      <Text className="type-body-bold text-foreground">{t("payments.proposal.propose")}</Text>
      <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
        <Text className="type-caption text-muted-foreground">
          {t("payments.proposal.currentNote", { price: formatPrice(order.pricePerKg) })}
        </Text>
        <AppTextField
          label={t("payments.proposal.newPriceLabel")}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          returnKeyType="next"
          error={error ?? undefined}
        />
        <AppTextField
          label={t("payments.proposal.reasonLabel")}
          value={reason}
          onChangeText={setReason}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <AppButton
          label={submitting ? "Sending…" : t("payments.proposal.send")}
          onPress={() => void submit()}
          disabled={submitting}
        />
        <AppButton
          label={t("common.cancel")}
          variant="outline"
          onPress={() => setOpen(false)}
          disabled={submitting}
        />
      </VStack>
    </VStack>
  );
}
