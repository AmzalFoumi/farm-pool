/**
 * The receipt for one order (FARM-48): every movement of money on it, in plain sentences.
 *
 * Not a stored document. It is the payment's entries read back in order, so it cannot disagree
 * with what actually happened, and it grows by a line each time money moves. The buyer and the
 * farmer open the same screen and read it in their own terms — "you paid" for one is "the buyer
 * paid" for the other — with the same receipt numbers, so either can quote one to the other.
 */

import {
  cropById,
  type Order,
  type Payment,
  type PaymentEntry,
  type PaymentEntryKind
} from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { ordersApi } from "@/features/orders/api";
import { PaymentStatusPill } from "@/features/orders/status-pill";
import { paymentsApi } from "@/features/payments/api";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Viewer = "buyer" | "farmer";

export default function ReceiptScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const receipt = useRequest(async () => {
    const [order, payment] = await Promise.all([
      ordersApi.get(token ?? "", orderId),
      paymentsApi.get(token ?? "", orderId)
    ]);
    return { order, payment };
  }, `${token}|${orderId}`);

  return (
    <View className="flex-1 bg-background">
      <AppBar
        title="Receipt"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/orders"))}
      />
      <RequestView request={receipt}>
        {({ order, payment }) => (
          <ReceiptBody
            order={order}
            payment={payment}
            viewer={user?.id === order.farmerId ? "farmer" : "buyer"}
            bottomInset={insets.bottom}
          />
        )}
      </RequestView>
    </View>
  );
}

/** What one entry means to the person reading it. `amount` is already formatted. */
const SENTENCE: Record<
  PaymentEntryKind,
  Record<Viewer, (amount: string, farmerName: string) => string>
> = {
  deposit: {
    buyer: (amount) => `You paid ${amount} for this order.`,
    farmer: (amount) => `The buyer paid ${amount} for this order.`
  },
  advance_release: {
    buyer: (amount, farmerName) => `${amount} was sent to ${farmerName} as an advance.`,
    farmer: (amount) => `You received ${amount} as an advance.`
  },
  balance_release: {
    buyer: (amount, farmerName) =>
      `${amount} was sent to ${farmerName} after you confirmed the order arrived.`,
    farmer: (amount) => `You received ${amount} after the buyer confirmed the order arrived.`
  },
  top_up: {
    buyer: (amount) => `You added ${amount} because the price went up.`,
    farmer: (amount) => `The buyer added ${amount} because the price went up.`
  },
  refund: {
    buyer: (amount) => `${amount} was returned to you because the price went down.`,
    farmer: (amount) => `${amount} was returned to the buyer because the price went down.`
  }
};

function ReceiptBody({
  order,
  payment,
  viewer,
  bottomInset
}: {
  order: Order;
  payment: Payment;
  viewer: Viewer;
  bottomInset: number;
}) {
  const crop = cropById(order.cropId);
  const farmer = viewer === "farmer";

  const summary = [
    { label: "Order", value: `${order.quantityKg} kg at ${formatPrice(order.pricePerKg)} / kg` },
    { label: "Total", value: formatPrice(payment.total) },
    {
      label: farmer ? "Paid to you" : `Paid to ${order.farmerName}`,
      value: formatPrice(payment.total - payment.heldAmount)
    },
    { label: "Still held", value: formatPrice(payment.heldAmount) }
  ];

  return (
    <ScrollView
      contentContainerClassName="gap-4 p-gutter"
      contentContainerStyle={{ paddingBottom: Math.max(bottomInset, 23) }}
    >
      <HStack className="items-center gap-3">
        <CropTile emoji={crop.emoji} />
        <VStack className="flex-1">
          <Text className="type-h3 text-foreground">{crop.name}</Text>
          <Text className="type-caption text-muted-foreground">
            {farmer ? "Sold by you" : `From ${order.farmerName}`}
          </Text>
        </VStack>
        <PaymentStatusPill status={payment.status} />
      </HStack>

      <VStack className="gap-3 rounded-card border border-border bg-card p-4">
        {summary.map(({ label, value }, i) => (
          <HStack
            key={label}
            className={`items-start justify-between gap-4 ${i > 0 ? "border-t border-border pt-3" : ""}`}
          >
            <Text className="type-body text-muted-foreground">{label}</Text>
            <Text className="type-body-bold flex-1 text-right text-foreground">{value}</Text>
          </HStack>
        ))}
      </VStack>

      <Text className="type-body-bold text-foreground">What happened</Text>
      {payment.entries.map((entry) => (
        <EntryCard
          key={entry.receiptNo}
          entry={entry}
          viewer={viewer}
          farmerName={order.farmerName}
        />
      ))}

      <Box className="rounded-field bg-muted p-3">
        <Text className="type-caption text-muted-foreground">
          This was a demo payment. No real money moved.
        </Text>
      </Box>
    </ScrollView>
  );
}

function EntryCard({
  entry,
  viewer,
  farmerName
}: {
  entry: PaymentEntry;
  viewer: Viewer;
  farmerName: string;
}) {
  return (
    <VStack className="gap-2 rounded-card border border-border bg-card p-4">
      <Text className="type-body-lg text-foreground">
        {SENTENCE[entry.kind][viewer](formatPrice(entry.amount), farmerName)}
      </Text>
      <Text className="type-caption text-muted-foreground">
        {formatDate(entry.at)} at {formatTime(entry.at)}
      </Text>
      {/* `selectable` so the number can be copied into a message when something is disputed. */}
      <Text selectable className="type-caption-bold text-muted-foreground">
        Receipt no. {entry.receiptNo}
      </Text>
    </VStack>
  );
}
