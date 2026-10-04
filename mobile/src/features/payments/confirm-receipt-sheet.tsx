import type { Order, Payment } from "@farm-pool/shared";
import { useState } from "react";

import { AppButton } from "@/components/app/app-button";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper
} from "@/components/ui/actionsheet";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { paymentsApi } from "@/features/payments/api";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/**
 * The buyer confirms the produce arrived, which releases the held balance (FARM-51).
 *
 * A second step rather than a single tap because it cannot be undone: once the balance is with
 * the farmer, a problem with the goods is a dispute, not a button. The sheet says the amount and
 * says that, so the tap that sends the money is never the first one.
 */
export function ConfirmReceiptSheet({
  open,
  onClose,
  order,
  payment,
  token,
  onConfirmed,
  bottomInset
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  payment: Payment;
  token: string;
  onConfirmed: (payment: Payment) => void;
  bottomInset: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const released = await paymentsApi.confirmReceipt(token, order.id);
      onClose();
      onConfirmed(released);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not confirm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Actionsheet isOpen={open} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent
        className="rounded-t-sheet bg-card px-gutter"
        style={{ paddingBottom: Math.max(bottomInset, 16) }}
      >
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        <VStack className="w-full gap-4 pt-2">
          <Text className="type-h3 text-foreground">Did your order arrive?</Text>
          <Text className="type-body text-muted-foreground">
            Confirming sends the {formatPrice(payment.heldAmount)} still held to {order.farmerName}.
            This cannot be undone.
          </Text>
          {order.collectedKg !== undefined && order.collectedKg !== order.quantityKg ? (
            <Text className="type-body text-foreground">
              You ordered {order.quantityKg} kg. The driver collected {order.collectedKg} kg.
            </Text>
          ) : null}

          {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

          <AppButton
            label={submitting ? "Confirming…" : "Yes, it arrived"}
            onPress={() => void submit()}
            disabled={submitting}
          />
          <AppButton label="Not yet" variant="outline" onPress={onClose} disabled={submitting} />
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
