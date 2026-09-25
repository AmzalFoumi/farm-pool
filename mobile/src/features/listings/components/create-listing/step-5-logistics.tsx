import { useState } from "react";
import { Alert } from "react-native";
import { cropById, districtSchema, type CropId, type FulfillmentOption } from "@farm-pool/shared";

import { AppTextField } from "@/components/app/app-text-field";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";

import { WizardActions, WizardShell } from "./wizard-shell";

export type Step5LogisticsData = {
  fulfillmentOption: FulfillmentOption;
  harvestDate: string;
  validityDays?: number;
  district?: string;
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
  { label: "Today", days: 0 },
  { label: "In a Week", days: 7 },
  { label: "In a Month", days: 30 }
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

export default function Step5Logistics({
  cropId = "tomato",
  batchInfo = { quantity: 300, unit: "kg", grade: "A", variety: "Roma" },
  initialData,
  onNext,
  onBack
}: Step5LogisticsProps) {
  const crop = cropById(cropId) || cropById("tomato");

  /* Coming back to this step, the date already chosen is a real date, so reopen it in the
     calendar field rather than resetting to a quick option. */
  const [dateMode, setDateMode] = useState<"quick" | "calendar">(
    initialData?.harvestDate ? "calendar" : "quick"
  );
  const [harvestDate, setHarvestDate] = useState<string>("Today");
  const [customDate, setCustomDate] = useState<string>(initialData?.harvestDate ?? "");
  const [district, setDistrict] = useState<string>(initialData?.district ?? "");
  const [districtError, setDistrictError] = useState<string | undefined>();
  const [transportType, setTransportType] = useState<"shared" | "solo">(
    initialData?.fulfillmentOption === "solo" ? "solo" : "shared"
  );

  const handleContinue = () => {
    /* The district is where buyers search and where the coordinator's region is matched, so it
       has to be the farmer's own answer, not a default. */
    const parsedDistrict = districtSchema.safeParse(district);
    if (!parsedDistrict.success) {
      setDistrictError(parsedDistrict.error.issues[0]?.message ?? "Enter a district");
      return;
    }
    setDistrictError(undefined);
    let finalDate: string;
    if (dateMode === "calendar") {
      finalDate = customDate.trim();
      if (!ISO_DATE.test(finalDate) || Number.isNaN(Date.parse(finalDate))) {
        Alert.alert("Check the date", "Enter the ready date as YYYY-MM-DD, e.g. 2026-09-25.");
        return;
      }
    } else {
      const option = QUICK_HARVEST_OPTIONS.find((o) => o.label === harvestDate);
      finalDate = isoDateFromToday(option?.days ?? 0);
    }
    onNext?.({
      fulfillmentOption: transportType,
      harvestDate: finalDate,
      district: parsedDistrict.data
    });
  };

  const currentDisplayDate =
    dateMode === "calendar" && customDate.trim() ? customDate.trim() : harvestDate;

  return (
    <WizardShell
      step={5}
      title="Schedule Transport"
      onBack={onBack}
      help="Tell buyers where the produce is, when it is ready, and whether you want to share transport with nearby farms or arrange your own."
      footer={
        <>
          <WizardActions
            onBack={onBack}
            continueLabel="Review Listing"
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
              {crop.name} • {batchInfo.quantity} {batchInfo.unit}
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
            <Text className="type-h4 text-foreground">Harvest / Ready Date</Text>
          </HStack>
          <Text className="type-caption text-muted-foreground">
            Select when crop will be ready for pickup
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
              Quick Options
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
              Custom Calendar
            </Text>
          </Pressable>
        </HStack>

        {/* Quick Options Chips */}
        {dateMode === "quick" && (
          <HStack className="gap-2">
            {QUICK_HARVEST_OPTIONS.map(({ label: opt }) => {
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
                    {opt}
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
              Enter Ready Date (YYYY-MM-DD):
            </Text>
            <AppTextField
              label="Ready Date (YYYY-MM-DD)"
              placeholder="e.g. 2026-09-25"
              value={customDate}
              onChangeText={setCustomDate}
            />
          </VStack>
        )}

        {/* Selected Schedule Display Banner */}
        <HStack className="items-center justify-between rounded-field border border-border bg-secondary p-3">
          <HStack className="items-center gap-2">
            <Text className="type-body-sm-bold text-secondary-foreground">Ready Timeframe:</Text>
          </HStack>
          <Text className="type-body-bold text-foreground">{currentDisplayDate}</Text>
        </HStack>
      </VStack>

      {/* Farm district */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <AppTextField
          label="Farm district"
          value={district}
          onChangeText={setDistrict}
          placeholder="e.g. Kurunegala"
          autoCapitalize="words"
          error={districtError}
        />
      </VStack>

      {/* Transport Method Section */}
      <VStack className="gap-3">
        <VStack className="gap-0.5 px-1">
          <HStack className="items-center gap-2">
            <Text className="type-h4 text-foreground">Transport Method</Text>
          </HStack>
          <Text className="type-caption text-muted-foreground">
            How would you like to move your crop?
          </Text>
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
                  Shared Transport
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
                Share truck space with nearby farms going the same way.
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
                  Solo Transport
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
                Arrange your own vehicle from your farm gate.
              </Text>
            </VStack>
          </HStack>
        </Pressable>
      </VStack>
    </WizardShell>
  );
}
