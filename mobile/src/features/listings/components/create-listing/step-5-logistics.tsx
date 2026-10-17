import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import {
  cropById,
  districtSchema,
  type CropId,
  type FulfillmentOption,
  type CollectionWindow,
  type PickupPoint
} from "@farm-pool/shared";

import { AppTextField } from "@/components/app/app-text-field";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { PointPicker } from "@/features/geo/point-picker";
import { CropTile } from "@/features/listings/crop-tile";

import { WizardActions, WizardShell } from "./wizard-shell";

export type Step5LogisticsData = {
  fulfillmentOption: FulfillmentOption;
  harvestDate: string;
  validityDays?: number;
  district?: string;
  /** The farm gate, if the farmer dropped a pin (FARM-26). Optional by design. */
  pickupPoint?: PickupPoint;
  /** When the farmer can be ready (FARM-61). A driver promises a slot inside this. */
  collectionWindow?: CollectionWindow;
  notes?: string;
};

type Step5LogisticsProps = {
  cropId?: CropId;
  batchInfo?: {
    quantity: number;
    unit: string;
    grade: string;
    variety: string;
    pricePerKg?: number;
  };
  initialData?: Partial<Step5LogisticsData>;
  onNext?: (data: Step5LogisticsData) => void;
  onBack?: () => void;
};

/** The quick choices and how many days from today each one means. */
const QUICK_HARVEST_OPTIONS = [
  { key: "today", days: 0 },
  { key: "week", days: 7 },
  { key: "month", days: 30 }
];

/** Today plus `days`, as the `YYYY-MM-DD` the api expects, in the phone's own calendar. */
function isoDateFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parts of the day a farmer actually thinks in, as minutes from midnight (FARM-61). Wide on
 *  purpose — the farmer says when they *can* be ready, and the driver narrows it. */
const READY_PRESETS = [
  { key: "morning", from: 6 * 60, to: 12 * 60 },
  { key: "afternoon", from: 12 * 60, to: 17 * 60 },
  { key: "allDay", from: 6 * 60, to: 17 * 60 }
];

export default function Step5Logistics({
  cropId = "tomato",
  batchInfo = { quantity: 300, unit: "kg", grade: "A", variety: "Roma" },
  initialData,
  onNext,
  onBack
}: Step5LogisticsProps) {
  const { t } = useTranslation();
  const crop = cropById(cropId) || cropById("tomato");

  /* Coming back to this step, the date already chosen is a real date, so reopen it in the
     calendar field rather than resetting to a quick option. */
  const [dateMode, setDateMode] = useState<"quick" | "calendar">(
    initialData?.harvestDate ? "calendar" : "quick"
  );
  /* Holds the option key, not its label: the label is translated at render, so storing it would
     mean the selection stopped matching as soon as the language changed. */
  const [harvestDate, setHarvestDate] = useState<string>("today");
  const [customDate, setCustomDate] = useState<string>(initialData?.harvestDate ?? "");
  const [district, setDistrict] = useState<string>(initialData?.district ?? "");
  const [districtError, setDistrictError] = useState<string | undefined>();
  const [pickupPoint, setPickupPoint] = useState<PickupPoint | undefined>(initialData?.pickupPoint);
  /* Defaults to a morning, which is when the research says produce actually moves — a farmer who
     agrees can tap straight through, and one who cannot changes it. */
  const [readyFrom, setReadyFrom] = useState(READY_PRESETS[0]);
  const [transportType, setTransportType] = useState<"shared" | "solo">(
    initialData?.fulfillmentOption === "solo" ? "solo" : "shared"
  );

  const handleContinue = () => {
    /* The district is where buyers search and where the coordinator's region is matched, so it
       has to be the farmer's own answer, not a default. */
    const parsedDistrict = districtSchema.safeParse(district);
    if (!parsedDistrict.success) {
      setDistrictError(parsedDistrict.error.issues[0]?.message ?? t("listings.step5.dateError"));
      return;
    }
    setDistrictError(undefined);
    let finalDate: string;
    if (dateMode === "calendar") {
      finalDate = customDate.trim();
      if (!ISO_DATE.test(finalDate) || Number.isNaN(Date.parse(finalDate))) {
        Alert.alert(t("listings.step5.dateAlertTitle"), t("listings.step5.dateAlertBody"));
        return;
      }
    } else {
      const option = QUICK_HARVEST_OPTIONS.find((o) => o.key === harvestDate);
      finalDate = isoDateFromToday(option?.days ?? 0);
    }
    onNext?.({
      fulfillmentOption: transportType,
      harvestDate: finalDate,
      district: parsedDistrict.data,
      ...(pickupPoint ? { pickupPoint } : {}),
      /* Anchored to the harvest date, so "ready in the morning" means the morning the produce is
         actually picked rather than today. */
      collectionWindow: {
        date: finalDate,
        from: readyFrom.from,
        to: readyFrom.to
      }
    });
  };

  const currentDisplayDate =
    dateMode === "calendar" && customDate.trim() ? customDate.trim() : harvestDate;

  return (
    <WizardShell
      step={5}
      title={t("listings.step5.title")}
      onBack={onBack}
      help={t("listings.step5.help")}
      footer={
        <>
          <WizardActions
            onBack={onBack}
            continueLabel={t("listings.step5.continueLabel")}
            onContinue={handleContinue}
          />
        </>
      }
    >
      {/* Dynamic Crop & Batch Context Banner */}
      <HStack className="elevation-card items-center justify-between rounded-card border border-border bg-card p-3">
        <HStack className="flex-1 items-center gap-3">
          <CropTile emoji={crop.emoji} />
          <VStack className="flex-1 min-w-0">
            <Text className="type-body-bold text-foreground" numberOfLines={1}>
              {t(cropLabelKey(crop.id))} • {batchInfo.quantity} {batchInfo.unit}
            </Text>
            <Text className="type-caption text-muted-foreground" numberOfLines={1}>
              Grade {batchInfo.grade} • {batchInfo.variety}
            </Text>
          </VStack>
        </HStack>

        <Box className="rounded-chip bg-secondary border border-border px-2.5 py-0.5">
          <Text className="type-body-sm-bold text-secondary-foreground">{crop.category}</Text>
        </Box>
      </HStack>

      {/* Harvest / Ready Date Section Card */}
      <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
        <VStack className="gap-0.5">
          <HStack className="items-center gap-2">
            <Text className="type-h4 text-foreground">{t("listings.step5.readyDateHeading")}</Text>
          </HStack>
          <Text className="type-caption text-muted-foreground">
            {t("listings.step5.selectReady")}
          </Text>
        </VStack>

        {/* Mode Switcher Tabs */}
        <HStack className="rounded-field bg-secondary p-1 border border-border">
          <Pressable
            onPress={() => setDateMode("quick")}
            accessibilityRole="tab"
            accessibilityState={{ selected: dateMode === "quick" }}
            className={`min-h-tap flex-1 items-center justify-center py-2 rounded-field ${
              dateMode === "quick" ? "bg-card border border-border" : ""
            }`}
          >
            <Text
              className={`type-body-sm-bold ${
                dateMode === "quick" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t("listings.step5.quickOptions")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDateMode("calendar")}
            accessibilityRole="tab"
            accessibilityState={{ selected: dateMode === "calendar" }}
            className={`min-h-tap flex-1 items-center justify-center py-2 rounded-field ${
              dateMode === "calendar" ? "bg-card border border-border" : ""
            }`}
          >
            <Text
              className={`type-body-sm-bold ${
                dateMode === "calendar" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t("listings.step5.customCalendar")}
            </Text>
          </Pressable>
        </HStack>

        {/* Quick Options Chips */}
        {dateMode === "quick" && (
          <HStack className="gap-2">
            {QUICK_HARVEST_OPTIONS.map(({ key: opt }) => {
              const isSelected = harvestDate === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setHarvestDate(opt)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={`h-tap flex-1 items-center justify-center rounded-field border ${
                    isSelected ? "border-primary bg-secondary" : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={`type-body-sm-bold ${isSelected ? "text-secondary-foreground" : "text-foreground"}`}
                  >
                    {t(`listings.step5.presets.${opt}`)}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        )}

        {/* Custom Calendar Input */}
        {dateMode === "calendar" && (
          <VStack className="gap-2 rounded-field bg-muted p-3 border border-border">
            <Text className="type-caption-bold text-secondary-foreground">
              {t("listings.step5.enterReadyDate")}
            </Text>
            <AppTextField
              label={t("listings.step5.readyDateLabel")}
              placeholder={t("listings.step5.datePlaceholder")}
              value={customDate}
              onChangeText={setCustomDate}
            />
          </VStack>
        )}

        {/* Selected Schedule Display Banner */}
        <HStack className="items-center justify-between rounded-field border border-border bg-secondary p-3">
          <HStack className="items-center gap-2">
            <Text className="type-body-sm-bold text-secondary-foreground">
              {t("listings.step5.readyTimeframe")}
            </Text>
          </HStack>
          <Text className="type-body-bold text-foreground">{currentDisplayDate}</Text>
        </HStack>
      </VStack>

      {/* Farm district */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <AppTextField
          label={t("listings.step5.districtLabel")}
          value={district}
          onChangeText={setDistrict}
          placeholder={t("listings.step5.districtPlaceholder")}
          autoCapitalize="words"
          error={districtError}
        />
      </VStack>

      {/* When the farmer can be ready (FARM-61). Whole parts of the day rather than a clock:
          a farmer knows "morning", and a driver promises a narrower slot inside it. */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <VStack className="gap-0.5">
          <Text className="type-h4 text-foreground">{t("listings.step5.lorryHeading")}</Text>
          <Text className="type-caption text-muted-foreground">
            {t("listings.step5.windowNote")}
          </Text>
        </VStack>
        <HStack className="gap-2">
          {READY_PRESETS.map((preset) => {
            const selected = readyFrom.key === preset.key;
            return (
              <Pressable
                key={preset.key}
                onPress={() => setReadyFrom(preset)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`min-h-tap flex-1 items-center justify-center rounded-field border ${
                  selected ? "border-primary bg-secondary" : "border-border bg-card"
                }`}
              >
                <Text
                  className={`type-body-sm-bold ${
                    selected ? "text-secondary-foreground" : "text-foreground"
                  }`}
                >
                  {t(`listings.step5.windows.${preset.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
      </VStack>

      {/* Shown once the district resolves, because that is what the map centres on. */}
      <PointPicker
        district={district}
        title={t("listings.step5.gateTitle")}
        help={t("listings.step5.gateHelp")}
        unsetNote={t("listings.step5.gateUnset", { district })}
        value={pickupPoint}
        onChange={setPickupPoint}
      />

      {/* Transport Method Section */}
      <VStack className="gap-3">
        <VStack className="gap-0.5 px-1">
          <HStack className="items-center gap-2">
            <Text className="type-h4 text-foreground">{t("listings.step5.transportHeading")}</Text>
          </HStack>
          <Text className="type-caption text-muted-foreground">{t("listings.step5.moveCrop")}</Text>
        </VStack>

        {/* Shared Transport Radio Card (Recommended) */}
        <Pressable
          onPress={() => setTransportType("shared")}
          accessibilityRole="radio"
          accessibilityState={{ checked: transportType === "shared" }}
          className={`elevation-card relative flex-col rounded-card border-2 p-4 transition-all ${
            transportType === "shared" ? "border-primary bg-secondary" : "border-border bg-card"
          }`}
        >
          <HStack className="items-start gap-3">
            <VStack className="flex-1 min-w-0 gap-1">
              <HStack className="items-center justify-between">
                <Text
                  className={`type-body-bold ${
                    transportType === "shared" ? "text-primary" : "text-foreground"
                  }`}
                >
                  {t("listings.step5.shared")}
                </Text>
                <Box
                  className={`h-5 w-5 items-center justify-center rounded-pill border ${
                    transportType === "shared"
                      ? "border-primary bg-primary"
                      : "border-border bg-transparent"
                  }`}
                >
                  {transportType === "shared" && (
                    <Box className="h-2 w-2 rounded-pill bg-primary-foreground" />
                  )}
                </Box>
              </HStack>

              <Text className="type-caption text-muted-foreground">
                {t("listings.step5.sharedNote")}
              </Text>
            </VStack>
          </HStack>
        </Pressable>

        {/* Solo Transport Radio Card */}
        <Pressable
          onPress={() => setTransportType("solo")}
          accessibilityRole="radio"
          accessibilityState={{ checked: transportType === "solo" }}
          className={`elevation-card relative flex-col rounded-card border-2 p-4 transition-all ${
            transportType === "solo" ? "border-primary bg-secondary" : "border-border bg-card"
          }`}
        >
          <HStack className="items-start gap-3">
            <VStack className="flex-1 min-w-0 gap-1">
              <HStack className="items-center justify-between">
                <Text
                  className={`type-body-bold ${
                    transportType === "solo" ? "text-primary" : "text-foreground"
                  }`}
                >
                  {t("listings.step5.solo")}
                </Text>
                <Box
                  className={`h-5 w-5 items-center justify-center rounded-pill border ${
                    transportType === "solo"
                      ? "border-primary bg-primary"
                      : "border-border bg-transparent"
                  }`}
                >
                  {transportType === "solo" && (
                    <Box className="h-2 w-2 rounded-pill bg-primary-foreground" />
                  )}
                </Box>
              </HStack>

              <Text className="type-caption text-muted-foreground">
                {t("listings.step5.soloNote")}
              </Text>
            </VStack>
          </HStack>
        </Pressable>
      </VStack>
    </WizardShell>
  );
}
