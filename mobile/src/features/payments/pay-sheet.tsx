import { splitTotal, type Order, type Payment } from "@farm-pool/shared";
import { useState } from "react";

import { AppButton } from "@/components/app/app-button";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper
} from "@/components/ui/actionsheet";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { paymentsApi } from "@/features/payments/api";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/**
 * The buyer pays for an accepted order (FARM-41).
 *
 * There is nothing to type. The amount is the order's total and the split is `ADVANCE_RATE`,
 * both decided on the server; this sheet exists to say, before the tap, exactly where the money
 * goes — the research's buyers would not prepay a farmer they had never met, and "most of it is
 * held until you have the goods" is the answer to that.
 *
 * It says plainly that no real money moves. A demo that looked like a real charge would be the
 * one screen in the app that lies.
 */
export function PaySheet({
  open,
  onClose,
  order,
  token,
  onPaid,
  bottomInset
}: {
  open: boolean;
  onClose: () => void;
  order: Order;
  token: string;
  onPaid: (payment: Payment) => void;
  bottomInset: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { advanceAmount, heldAmount } = splitTotal(order.total);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const payment = await paymentsApi.pay(token, order.id);
      onClose();
      onPaid(payment);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not make the payment");
    } finally {
      setSubmitting(false);
    }
  };

  const rows = [
    { label: `Goes to ${order.farmerName} now`, value: formatPrice(advanceAmount) },
    { label: "Held until you confirm it arrived", value: formatPrice(heldAmount) }
  ];

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
          <Text className="type-h3 text-foreground">Pay for this order</Text>

          <VStack className="gap-3 rounded-card border border-border bg-background p-4">
            <HStack className="items-start justify-between gap-4">
              <Text className="type-body-bold text-foreground">You pay</Text>
              <Text className="type-h4 text-foreground">{formatPrice(order.total)}</Text>
            </HStack>
            {rows.map(({ label, value }) => (
              <HStack
                key={label}
                className="items-start justify-between gap-4 border-t border-border pt-3"
              >
                <Text className="type-body flex-1 text-muted-foreground">{label}</Text>
                <Text className="type-body-bold text-foreground">{value}</Text>
              </HStack>
            ))}
          </VStack>

          <Box className="rounded-field bg-muted p-3">
            <Text className="type-caption text-muted-foreground">
              This is a demo payment. No real money moves.
            </Text>
          </Box>

          {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

          <AppButton
            label={submitting ? "Paying…" : `Pay ${formatPrice(order.total)}`}
            onPress={() => void submit()}
            disabled={submitting}
          />
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
}
