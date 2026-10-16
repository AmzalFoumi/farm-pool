import type { DriverProfile } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { AppButton } from "@/components/app/app-button";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DriverVerificationPill } from "@/features/orders/status-pill";

import { vehicleLabelKey } from "../../vehicles";
import { DetailRow } from "./detail-row";

/** The vehicle farmers will see, its check (LP-03), and the way into the wizard to change it. */
export function VehicleCard({ driver, onEdit }: { driver: DriverProfile; onEdit: () => void }) {
  const { t } = useTranslation();

  return (
    <VStack className="gap-2.5">
      <HStack className="items-center justify-between">
        <Text className="type-body-bold text-foreground">{t("profile.vehicle")}</Text>
        <DriverVerificationPill status={driver.verification} />
      </HStack>

      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <DetailRow
          label={t("vehicleWizard.row.vehicle")}
          value={t(vehicleLabelKey(driver.vehicleType))}
        />
        <Box className="h-px bg-border" />
        <DetailRow label={t("vehicleWizard.row.plate")} value={driver.registration} />
        <Box className="h-px bg-border" />
        <DetailRow
          label={t("vehicleWizard.row.load")}
          value={t("common.kg", { count: driver.capacityKg })}
        />
        <Box className="h-px bg-border" />
        <DetailRow label={t("vehicleWizard.row.district")} value={driver.operatingDistrict} />
      </VStack>

      <Text className="type-caption text-muted-foreground">
        {t(`profile.verification.${driver.verification}`)}
      </Text>

      <AppButton label={t("vehicleWizard.editVehicle")} variant="outline" onPress={onEdit} />
    </VStack>
  );
}
