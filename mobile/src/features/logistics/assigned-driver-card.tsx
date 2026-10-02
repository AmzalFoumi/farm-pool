import { type AssignedDriver } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DetailRow } from "@/features/driver/components/profile/detail-row";
import { vehicleById } from "@/features/driver/vehicles";
import { DriverVerificationPill } from "@/features/orders/status-pill";
import { ContactCard } from "@/features/logistics/contact-card";
import { logisticsApi } from "@/features/logistics/api";
import { useRequest } from "@/lib/use-request";

/**
 * Who is collecting this order, on the farmer's and buyer's side (LP-04, LP-51).
 *
 * **The plate is the point.** A farmer reads this with a vehicle in front of them and checks the
 * number on the screen against the number on the lorry before handing over produce — that check
 * is the reason driver verification exists at all, and it is why the plate is set larger than
 * anything else here.
 *
 * Renders nothing at all until a driver has accepted, rather than an empty "no driver yet" card:
 * on an order still waiting for one, the card would be noise on every screen it appears on.
 */
export function AssignedDriverCard({ token, orderId }: { token: string; orderId: string }) {
  const driver = useRequest(() => logisticsApi.driverFor(token, orderId), `${token}|${orderId}`);

  /* `no_driver_assigned` is the ordinary case, not a failure — so this is the one place in the
     app that swallows a request error instead of handing it to `RequestView`. Any other failure
     is swallowed too: an order screen that cannot load its driver is still a usable order
     screen, and a red block over the details would make it less so. */
  if (driver.status !== "ready") return null;

  return <DriverDetail driver={driver.data} />;
}

function DriverDetail({ driver }: { driver: AssignedDriver }) {
  const { t } = useTranslation();
  return (
    <VStack className="gap-2.5">
      <HStack className="items-center justify-between">
        <Text className="type-body-bold text-foreground">{t("jobs.driverCard.heading")}</Text>
        <DriverVerificationPill status={driver.verification} />
      </HStack>

      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <VStack className="gap-0.5">
          <Text className="type-caption text-muted-foreground">{t("jobs.driverCard.plate")}</Text>
          <Text className="type-h3 text-foreground">{driver.registration}</Text>
        </VStack>
        <Box className="h-px bg-border" />
        <DetailRow
          label={t("jobs.driverCard.vehicle")}
          value={vehicleById(driver.vehicleType).label}
        />
      </VStack>

      <ContactCard
        heading={t("jobs.driverCard.driver")}
        name={driver.displayName}
        phone={driver.phone}
        meta={`${vehicleById(driver.vehicleType).label} · ${driver.operatingDistrict}`}
      />

      {driver.verification !== "verified" ? (
        <Text className="type-caption text-muted-foreground">
          {t("jobs.driverCard.unverified")}
        </Text>
      ) : null}
    </VStack>
  );
}
