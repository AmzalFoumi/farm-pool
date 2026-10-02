import type { VehicleType } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { TextInput } from "react-native";

import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { DISTRICTS, VEHICLES } from "../../vehicles";
import { DistrictChip } from "../vehicle-wizard/district-chip";
import { StepHeading } from "./onboarding-shell";
import { VehicleTile } from "./vehicle-tile";

/**
 * The four vehicles the design puts on this screen, in its own order (Figma 196:6319 … 196:6350).
 *
 * `motorbike` and `van` stay in the shared `VehicleType` enum — existing accounts use them and
 * removing an enum member would orphan those records — but the design does not offer them here,
 * so a motorbike courier cannot currently sign up through this flow. Flagged for the designer
 * rather than silently adding a fifth and sixth tile to a grid drawn as 2x2.
 */
const SIGN_UP_VEHICLES = ["three-wheeler", "small-lorry", "lorry", "tractor"] as const;

export function Step3Vehicle({
  vehicleType,
  onSelectVehicle,
  registration,
  onChangeRegistration,
  district,
  onSelectDistrict,
  errors
}: {
  vehicleType: VehicleType | null;
  onSelectVehicle: (type: VehicleType) => void;
  registration: string;
  onChangeRegistration: (value: string) => void;
  district: string | null;
  onSelectDistrict: (district: string) => void;
  errors: { vehicleType?: string; registration?: string; operatingDistrict?: string };
}) {
  const { t } = useTranslation();
  const tiles = SIGN_UP_VEHICLES.map((id) => VEHICLES.find((v) => v.id === id)!);

  return (
    <VStack className="gap-5">
      <StepHeading title={t("driverSignUp.vehicle.title")} note={t("driverSignUp.vehicle.note")} />

      <VStack className="gap-2.5" accessibilityRole="radiogroup">
        <HStack className="gap-2.5">
          {tiles.slice(0, 2).map((v) => (
            <VehicleTile
              key={v.id}
              label={v.label}
              emoji={v.emoji}
              capacityKg={v.capacityKg}
              selected={vehicleType === v.id}
              onPress={() => onSelectVehicle(v.id)}
            />
          ))}
        </HStack>
        <HStack className="gap-2.5">
          {tiles.slice(2).map((v) => (
            <VehicleTile
              key={v.id}
              label={v.label}
              emoji={v.emoji}
              capacityKg={v.capacityKg}
              selected={vehicleType === v.id}
              onPress={() => onSelectVehicle(v.id)}
            />
          ))}
        </HStack>
        {errors.vehicleType ? (
          <Text className="type-caption text-destructive">{errors.vehicleType}</Text>
        ) : null}
      </VStack>

      <VStack className="gap-1.5">
        <Text className="type-body-sm-bold text-foreground">
          {t("driverSignUp.vehicle.plateLabel")}
        </Text>
        <TextInput
          value={registration}
          onChangeText={onChangeRegistration}
          placeholder={t("driverSignUp.vehicle.platePlaceholder")}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={t("driverSignUp.vehicle.plateLabel")}
          className={[
            "type-body-lg h-control rounded-field border px-4 text-foreground",
            errors.registration ? "border-destructive bg-card" : "border-border bg-card"
          ].join(" ")}
        />
        {errors.registration ? (
          <Text className="type-caption text-destructive">{errors.registration}</Text>
        ) : null}
      </VStack>

      {/* NOT IN THE FIGMA, AND DELIBERATE. `PUT /identity/me/vehicle` requires
          `operatingDistrict`, and the job board filters on it — a driver without one would
          finish sign-up and land on a permanently empty Jobs tab. Added to this step rather than
          as a fifth one so the header still reads "step 3 of 4" as drawn. Raise with the
          designer: either it belongs here, or the board needs another way to place a driver. */}
      <VStack className="gap-1.5">
        <Text className="type-body-sm-bold text-foreground">
          {t("driverSignUp.vehicle.districtLabel")}
        </Text>
        <Text className="type-caption text-muted-foreground">
          {t("driverSignUp.vehicle.districtNote")}
        </Text>
        <HStack className="flex-wrap gap-2 pt-1" accessibilityRole="radiogroup">
          {DISTRICTS.map((name) => (
            <DistrictChip
              key={name}
              name={name}
              selected={district === name}
              onPress={() => onSelectDistrict(name)}
            />
          ))}
        </HStack>
        {errors.operatingDistrict ? (
          <Text className="type-caption text-destructive">{errors.operatingDistrict}</Text>
        ) : null}
      </VStack>
    </VStack>
  );
}
