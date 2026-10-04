/**
 * One order, for its buyer and its farmer.
 *
 * The footer holds the one thing the buyer can do at this stage: cancel while it is still
 * `requested`, pay once the farmer has accepted (FARM-41), and confirm it arrived once the driver
 * has delivered it (FARM-51).
 */

import { can, cropById, type Order } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { AssignedDriverCard } from "@/features/logistics/assigned-driver-card";
import { ordersApi } from "@/features/orders/api";
import { OrderStatusPill, orderStatusLabel } from "@/features/orders/status-pill";
import { paymentsApi } from "@/features/payments/api";
import { ConfirmReceiptSheet } from "@/features/payments/confirm-receipt-sheet";
import { PaySheet } from "@/features/payments/pay-sheet";
import { PaymentCard } from "@/features/payments/payment-card";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const order = useRequest(() => ordersApi.get(token ?? "", id), `${token}|${id}`);

  return (
    <View className="flex-1 bg-background">
      {/* After Place order the detail replaced the listing, so "back" means the
          orders list, not the listing that no longer sits under it. */}
      <AppBar
        title="Order"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/orders"))}
      />
      <RequestView request={order}>
        {(data) => (
          <OrderBody
            order={data}
            token={token ?? ""}
            bottomInset={insets.bottom}
            onChanged={order.reload}
          />
        )}
      </RequestView>
    </View>
  );
}

function OrderBody({
  order,
  token,
  bottomInset,
  onChanged
}: {
  order: Order;
  token: string;
  bottomInset: number;
  onChanged: () => void;
}) {
  const crop = cropById(order.cropId);
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* An order nobody has paid for yet answers `payment_not_found`, which is the ordinary case
     rather than a failure, so this request is read directly instead of through `RequestView`. */
  const payment = useRequest(() => paymentsApi.get(token, order.id), `${token}|${order.id}`);

  const viewer = user?.id === order.farmerId ? "farmer" : "buyer";
  const canPay =
    order.status === "accepted" &&
    viewer === "buyer" &&
    user !== null &&
    can(user.role, "payment:pay");
  /* Only while money is still held: a delivered order that was never paid for through the app,
     or one already confirmed, has nothing left to release. */
  const heldPayment =
    order.status === "delivered" &&
    viewer === "buyer" &&
    user !== null &&
    can(user.role, "order:confirm-receipt") &&
    payment.status === "ready" &&
    payment.data.status === "in_escrow"
      ? payment.data
      : null;

  const openReceipt = () =>
    router.push({ pathname: "/receipt/[orderId]", params: { orderId: order.id } });

  /* Straight to the receipt after money moves (FARM-48): the research's farmer wanted an
     immediate confirmation, and a buyer who has just paid should see proof before anything
     else. The order behind it is reloaded so "back" lands on the new state. */
  const afterMoneyMoved = () => {
    payment.reload();
    onChanged();
    openReceipt();
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await ordersApi.cancel(token, order.id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel");
    } finally {
      setBusy(false);
    }
  };

  const rows = [
    { label: "Quantity", value: `${order.quantityKg} kg` },
    /* What the driver actually loaded, once they have (LP-50). Shown beside the ordered quantity
       rather than replacing it: the difference between the two is the thing worth seeing. */
    ...(order.collectedKg !== undefined
      ? [{ label: "Collected", value: `${order.collectedKg} kg` }]
      : []),
    { label: "Unit price", value: `${formatPrice(order.pricePerKg)} / kg` },
    { label: "Total", value: formatPrice(order.total) },
    { label: "Farmer", value: order.farmerName },
    { label: "Requested on", value: formatDate(order.createdAt) },
    ...(order.note ? [{ label: "Note", value: order.note }] : [])
  ];

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 p-gutter">
        <HStack className="items-center gap-3">
          <CropTile emoji={crop.emoji} />
          <VStack className="flex-1">
            <Text className="type-h3 text-foreground">{crop.name}</Text>
            <Text className="type-caption text-muted-foreground">
              {orderStatusLabel(order.status)}
            </Text>
          </VStack>
          <OrderStatusPill status={order.status} />
        </HStack>

        <VStack className="gap-3 rounded-card border border-border bg-card p-4">
          {rows.map(({ label, value }, i) => (
            <HStack
              key={label}
              className={`items-start justify-between gap-4 ${i > 0 ? "border-t border-border pt-3" : ""}`}
            >
              <Text className="type-body text-muted-foreground">{label}</Text>
              <Text className="type-body-bold flex-1 text-right text-foreground">{value}</Text>
            </HStack>
          ))}
        </VStack>

        {/* Renders itself away until a driver has taken the job, so there is no branch here. */}
        <AssignedDriverCard token={token} orderId={order.id} />

        {payment.status === "ready" ? (
          <PaymentCard
            payment={payment.data}
            viewer={viewer}
            farmerName={order.farmerName}
            onViewReceipt={openReceipt}
          />
        ) : null}

        {order.status === "requested" ? (
          <Text className="type-caption text-muted-foreground">
            Waiting for {order.farmerName} to accept. You can cancel until they do.
          </Text>
        ) : null}
        {order.status === "accepted" ? (
          <Text className="type-caption text-muted-foreground">
            {viewer === "buyer"
              ? `${order.farmerName} accepted. Pay to confirm the order and book a driver.`
              : "You accepted. A driver is booked once the buyer pays."}
          </Text>
        ) : null}
        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}
      </ScrollView>

      {order.status === "requested" ? (
        <VStack
          className="border-t border-border bg-card px-gutter pt-3"
          style={{ paddingBottom: Math.max(bottomInset, 23) }}
        >
          <AppButton
            label={busy ? "Cancelling…" : "Cancel request"}
            variant="outline"
            onPress={() => void cancel()}
            disabled={busy}
          />
        </VStack>
      ) : null}

      {canPay ? (
        <VStack
          className="border-t border-border bg-card px-gutter pt-3"
          style={{ paddingBottom: Math.max(bottomInset, 23) }}
        >
          <AppButton label={`Pay ${formatPrice(order.total)}`} onPress={() => setPaying(true)} />
        </VStack>
      ) : null}

      {heldPayment ? (
        <>
          <VStack
            className="border-t border-border bg-card px-gutter pt-3"
            style={{ paddingBottom: Math.max(bottomInset, 23) }}
          >
            <AppButton label="Confirm I received it" onPress={() => setConfirming(true)} />
          </VStack>
          <ConfirmReceiptSheet
            open={confirming}
            onClose={() => setConfirming(false)}
            order={order}
            payment={heldPayment}
            token={token}
            bottomInset={bottomInset}
            onConfirmed={afterMoneyMoved}
          />
        </>
      ) : null}

      <PaySheet
        open={paying}
        onClose={() => setPaying(false)}
        order={order}
        token={token}
        bottomInset={bottomInset}
        onPaid={afterMoneyMoved}
      />
    </>
  );
}
