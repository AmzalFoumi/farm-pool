import type { DriverProfile, DriverVerification } from "@farm-pool/shared";

import { AppButton } from "@/components/app/app-button";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DriverVerificationPill } from "@/features/orders/status-pill";

import { vehicleById } from "../../vehicles";
import { DetailRow } from "./detail-row";

/* What each state means for the driver, in their words. The check itself is not decided yet
   (`.plans/DECISIONS.md`), so nothing here names who does it. */
const VERIFICATION_NOTE: Record<DriverVerification, string> = {
  pending: "Your vehicle is waiting to be checked. Farmers see it as not yet verified.",
  verified: "Farmers see your vehicle as verified when you come to collect.",
  rejected: "Your vehicle was not approved. Check the plate number and save it again."
};

/** The vehicle farmers will see, its check (LP-03), and the way into the wizard to change it. */
export function VehicleCard({ driver, onEdit }: { driver: DriverProfile; onEdit: () => void }) {
  return (
    <VStack className="gap-2.5">
      <HStack className="items-center justify-between">
        <Text className="type-body-bold text-foreground">Vehicle</Text>
        <DriverVerificationPill status={driver.verification} />
      </HStack>

      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <DetailRow label="Vehicle" value={vehicleById(driver.vehicleType).label} />
        <Box className="h-px bg-border" />
        <DetailRow label="Plate number" value={driver.registration} />
        <Box className="h-px bg-border" />
        <DetailRow label="Most you can carry" value={`${driver.capacityKg.toLocaleString()} kg`} />
        <Box className="h-px bg-border" />
        <DetailRow label="District" value={driver.operatingDistrict} />
      </VStack>

      <Text className="type-caption text-muted-foreground">
        {VERIFICATION_NOTE[driver.verification]}
      </Text>

      <AppButton label="Edit vehicle" variant="outline" onPress={onEdit} />
    </VStack>
  );
}
