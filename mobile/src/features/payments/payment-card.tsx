import type { Payment } from "@farm-pool/shared";

import { HStack } from "@/components/ui/hstack";
import { ChevronRightIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { PaymentStatusPill } from "@/features/orders/status-pill";
import { formatPrice } from "@/lib/format";

/**
 * Where the money on an order is, for the buyer and the farmer (FARM-41, FARM-51).
 *
 * Three numbers and one sentence. The sentence is the part that matters: the research's farmer
 * distrusted digital payment and its buyer would not prepay a stranger, so each of them is told
 * in their own terms what has happened to the money and what happens next.
 */
export function PaymentCard({
  payment,
  viewer,
  farmerName,
  onViewReceipt
}: {
  payment: Payment;
  /** Which side of the deal is reading. Decides the wording, never the numbers. */
  viewer: "buyer" | "farmer";
  farmerName: string;
  onViewReceipt: () => void;
}) {
  const paidOut = payment.total - payment.heldAmount;
  const farmer = viewer === "farmer";

  const rows = [
    { label: farmer ? "Buyer paid" : "You paid", value: formatPrice(payment.total) },
    { label: farmer ? "Paid to you" : `Paid to ${farmerName}`, value: formatPrice(paidOut) },
    { label: "Still held", value: formatPrice(payment.heldAmount) }
  ];

  const held = formatPrice(payment.heldAmount);
  const note =
    payment.status === "released"
      ? farmer
        ? "You have been paid in full for this order."
        : `${farmerName} has been paid in full. Thank you.`
      : farmer
        ? `${held} is held for you. It is released when the buyer confirms the order arrived.`
        : `${held} is held safely. It goes to ${farmerName} when you confirm the order arrived.`;

  return (
    <VStack className="gap-2.5">
      <HStack className="items-center justify-between">
        <Text className="type-body-bold text-foreground">Payment</Text>
        <PaymentStatusPill status={payment.status} />
      </HStack>

      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        {rows.map(({ label, value }, i) => (
          <HStack
            key={label}
            className={`items-start justify-between gap-4 ${i > 0 ? "border-t border-border pt-3" : ""}`}
          >
            <Text className="type-body text-muted-foreground">{label}</Text>
            <Text className="type-body-bold flex-1 text-right text-foreground">{value}</Text>
          </HStack>
        ))}
        {/* The whole row is the tap target, not the chevron. */}
        <Pressable
          onPress={onViewReceipt}
          accessibilityRole="button"
          className="min-h-tap flex-row items-center justify-between border-t border-border pt-3 active:opacity-80"
        >
          <Text className="type-body-bold text-primary">View receipt</Text>
          <Icon as={ChevronRightIcon} className="h-5 w-5 text-primary" />
        </Pressable>
      </VStack>

      <Text className="type-caption text-muted-foreground">{note}</Text>
    </VStack>
  );
}
