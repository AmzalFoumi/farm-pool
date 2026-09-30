/**
 * One job, for a driver: what the load is, where it is, and the button that takes it.
 *
 * The farmer's number appears only after accepting — that is enforced on the api (`GetJob`), and
 * the screen simply renders what came back rather than hiding a field it was given. So there is
 * no branch here that could leak a contact by being wrong.
 */

import { cropById, type JobDetail } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DetailRow } from "@/features/driver/components/profile/detail-row";
import { logisticsApi } from "@/features/logistics/api";
import { ContactCard } from "@/features/logistics/contact-card";
import { OrderStatusPill } from "@/features/orders/status-pill";
import { ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

/** Why an accept failed, in the driver's words. Every one of these is a normal thing to happen on
 *  a board several drivers are watching, so none of them is phrased as an error. */
const ACCEPT_MESSAGE: Record<string, string> = {
  job_taken: "Another driver took this job first.",
  load_too_heavy: "This load is heavier than your vehicle can carry.",
  no_vehicle: "Add your vehicle before accepting a job.",
  job_not_found: "This job is no longer available.",
  network_error: "Can't reach the server. Check your connection and try again."
};

export default function JobDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const job = useRequest(
    () => logisticsApi.one(token ?? "", id ?? ""),
    `${token ?? ""}|${id ?? ""}`
  );

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const accept = async () => {
    setAcceptError(null);
    setAccepting(true);
    try {
      await logisticsApi.accept(token ?? "", id ?? "");
      /* Reload rather than write the response into state: the reloaded job carries the pickup
         contact the accept just unlocked, through exactly the path every other render used. */
      job.reload();
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "unknown";
      setAcceptError(ACCEPT_MESSAGE[code] ?? "Could not take this job. Please try again.");
      // Someone else may hold it now; the reloaded job says so.
      job.reload();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Job" onBack={() => router.back()} />
      <RequestView request={job}>
        {(detail) => (
          <>
            <ScrollView className="flex-1" contentContainerClassName="gap-5 px-gutter pb-6 pt-4">
              <JobHeader detail={detail} />

              <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
                <DetailRow label="Load" value={`${detail.quantityKg.toLocaleString()} kg`} />
                <Box className="h-px bg-border" />
                <DetailRow label="Order value" value={formatPrice(detail.total)} />
                <Box className="h-px bg-border" />
                <DetailRow
                  label="Trip"
                  value={detail.fulfillmentOption === "solo" ? "Dedicated vehicle" : "Shared"}
                />
              </VStack>

              {detail.pickup ? (
                <ContactCard
                  heading="Pickup"
                  name={detail.pickup.farmerName}
                  phone={detail.pickup.farmerPhone}
                  meta={[detail.pickup.address, detail.pickup.town, detail.pickup.district]
                    .filter(Boolean)
                    .join(", ")}
                  note={detail.pickup.farmgateNotes}
                />
              ) : (
                <VStack className="gap-1 rounded-card border border-border bg-muted p-4">
                  <Text className="type-body-bold text-foreground">
                    {detail.town ? `${detail.town}, ${detail.district}` : detail.district}
                  </Text>
                  <Text className="type-caption text-muted-foreground">
                    The farmer&apos;s phone number and directions to the gate appear once you take
                    this job.
                  </Text>
                </VStack>
              )}

              {detail.note ? (
                <VStack className="gap-1">
                  <Text className="type-body-bold text-foreground">Note from the buyer</Text>
                  <Text className="type-body text-muted-foreground">{detail.note}</Text>
                </VStack>
              ) : null}

              {acceptError ? (
                <Text className="type-body text-destructive" accessibilityRole="alert">
                  {acceptError}
                </Text>
              ) : null}
            </ScrollView>

            {detail.status === "open" ? (
              <View
                className="border-t border-border bg-card px-4 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 23) }}
              >
                <AppButton
                  label={accepting ? "Taking this job…" : "Take this job"}
                  disabled={accepting}
                  onPress={accept}
                />
              </View>
            ) : null}
          </>
        )}
      </RequestView>
    </View>
  );
}

function JobHeader({ detail }: { detail: JobDetail }) {
  const crop = cropById(detail.cropId);
  return (
    <VStack className="gap-2">
      <HStack className="items-center justify-between gap-3">
        <Text className="type-h3 flex-1 text-foreground" numberOfLines={2}>
          {crop.emoji} {detail.quantityKg} kg {crop.name}
        </Text>
        <OrderStatusPill status={detail.status} />
      </HStack>
      <Text className="type-body text-muted-foreground">Collect from {detail.farmerName}</Text>
    </VStack>
  );
}
