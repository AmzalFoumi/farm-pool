/**
 * One job, for a driver: what the load is, where it is, and the one action it is ready for.
 *
 * The farmer's number appears only after accepting — that is enforced on the api (`GetJob`), and
 * the screen simply renders what came back rather than hiding a field it was given. So there is
 * no branch here that could leak a contact by being wrong.
 *
 * The button belongs to `JobActions`, which picks it from the stage: take it, confirm the load is
 * on, confirm it is off. This screen never decides what a driver may do next.
 */

import { cropById, type JobDetail } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DetailRow } from "@/features/driver/components/profile/detail-row";
import { logisticsApi } from "@/features/logistics/api";
import { ContactCard } from "@/features/logistics/contact-card";
import { JobActions } from "@/features/logistics/job-actions";
import { JobMap } from "@/features/logistics/job-map";
import { OrderStatusPill } from "@/features/orders/status-pill";
import { formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function JobDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const job = useRequest(
    () => logisticsApi.one(token ?? "", id ?? ""),
    `${token ?? ""}|${id ?? ""}`
  );

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("jobs.detail.title")} onBack={() => router.back()} />
      <RequestView request={job}>
        {(detail) => (
          <>
            <ScrollView className="flex-1" contentContainerClassName="gap-5 px-gutter pb-6 pt-4">
              <JobHeader detail={detail} />

              <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
                <DetailRow
                  label={t("jobs.detail.ordered")}
                  value={t("common.kg", { count: detail.quantityKg })}
                />
                {detail.collectedKg !== undefined ? (
                  <>
                    <Box className="h-px bg-border" />
                    <DetailRow
                      label={t("jobs.detail.collected")}
                      value={t("common.kg", { count: detail.collectedKg })}
                    />
                  </>
                ) : null}
                <Box className="h-px bg-border" />
                <DetailRow label={t("jobs.detail.orderValue")} value={formatPrice(detail.total)} />
                {detail.dropOff ? (
                  <>
                    <Box className="h-px bg-border" />
                    <DetailRow
                      label={t("jobs.detail.dropOff")}
                      /* A buyer who pinned a one-off place gave it no name, so the distance is
                         the only useful thing to show in its place. */
                      value={
                        detail.dropOff.label ??
                        (detail.distanceKm !== undefined
                          ? t("jobs.detail.distance", { km: detail.distanceKm })
                          : t("jobs.detail.dropOffUnset"))
                      }
                    />
                  </>
                ) : null}
                {detail.dropOff?.label && detail.distanceKm !== undefined ? (
                  <>
                    <Box className="h-px bg-border" />
                    <DetailRow
                      label={t("jobs.detail.tripLength")}
                      value={t("jobs.detail.distance", { km: detail.distanceKm })}
                    />
                  </>
                ) : null}
                <Box className="h-px bg-border" />
                <DetailRow
                  label={t("jobs.detail.trip")}
                  value={t(
                    detail.fulfillmentOption === "solo"
                      ? "jobs.detail.tripSolo"
                      : "jobs.detail.tripShared"
                  )}
                />
              </VStack>

              {/* Where it is, before who to call about it: a driver deciding whether to take a
                  job looks at the place first. Renders nothing for a district the table does not
                  know, so this is not conditional on having accepted. */}
              <JobMap
                district={detail.district}
                town={detail.town}
                pickupPoint={detail.pickupPoint}
                label={detail.farmerName}
              />

              {detail.pickup ? (
                <ContactCard
                  heading={t("jobs.detail.pickup")}
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
                  <Text className="type-body-bold text-foreground">
                    {t("jobs.detail.buyerNote")}
                  </Text>
                  <Text className="type-body text-muted-foreground">{detail.note}</Text>
                </VStack>
              ) : null}
            </ScrollView>

            <JobActions
              job={detail}
              token={token ?? ""}
              bottomInset={insets.bottom}
              onChanged={job.reload}
            />
          </>
        )}
      </RequestView>
    </View>
  );
}

function JobHeader({ detail }: { detail: JobDetail }) {
  const { t } = useTranslation();
  const crop = cropById(detail.cropId);
  return (
    <VStack className="gap-2">
      <HStack className="items-center justify-between gap-3">
        <Text className="type-h3 flex-1 text-foreground" numberOfLines={2}>
          {crop.emoji} {t("jobs.detail.heading", { count: detail.quantityKg, crop: crop.name })}
        </Text>
        <OrderStatusPill status={detail.status} />
      </HStack>
      <Text className="type-body text-muted-foreground">Collect from {detail.farmerName}</Text>
    </VStack>
  );
}
