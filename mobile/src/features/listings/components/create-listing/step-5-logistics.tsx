import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cropById, districtSchema, type CropId } from "@farm-pool/shared";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { BackIcon, CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { HelpCircleIcon, Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";

export type Step5LogisticsData = {
  fulfillmentOption: "shared" | "solo" | "pickup" | "hub_delivery" | "farmpool_transport";
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
  const insets = useSafeAreaInsets();
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

  const handleShowHelp = () => {
    Alert.alert(
      "Schedule Transport Guidance",
      "Tell buyers when and how you want to move the goods. Shared transport connects you with nearby farms to save up to 40% on logistics."
    );
  };

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
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-gutter gap-5 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header navigation bar */}
        <VStack className="gap-3 pt-2">
          <HStack className="items-center justify-between">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-tap w-tap items-center justify-center rounded-field border border-border bg-card shadow-xs"
            >
              <BackIcon />
            </Pressable>

            <VStack className="items-center">
              <Text className="type-body-sm-bold uppercase text-secondary-foreground">
                Step 5 of 5
              </Text>
              <Text className="type-title text-foreground">Schedule Transport</Text>
            </VStack>

            <Pressable
              onPress={handleShowHelp}
              accessibilityRole="button"
              accessibilityLabel="Help"
              className="h-tap w-tap items-center justify-center rounded-field bg-info-subtle border border-info/20"
            >
              <Icon as={HelpCircleIcon} className="text-brand-deep" />
            </Pressable>
          </HStack>

          {/* 100% Progress Bar Track */}
          <Box className="h-1.5 w-full overflow-hidden rounded-pill bg-muted border border-border">
            <Box className="h-full w-full rounded-pill bg-brand-deep" />
          </Box>
        </VStack>

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

          <Box className="rounded-chip bg-warning-subtle border border-warning/20 px-2.5 py-0.5">
            <Text className="type-body-sm-bold text-warning">{crop.category}</Text>
          </Box>
        </HStack>

        {/* Harvest / Ready Date Section Card */}
        <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
          <VStack className="gap-0.5">
            <HStack className="items-center gap-2">
              <Text className="type-h4 text-foreground font-bold">📅 Harvest / Ready Date</Text>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Select when crop will be ready for pickup
            </Text>
          </VStack>

          {/* Mode Switcher Tabs */}
          <HStack className="rounded-field bg-secondary/30 p-1 border border-border">
            <Pressable
              onPress={() => setDateMode("quick")}
              accessibilityRole="tab"
              accessibilityState={{ selected: dateMode === "quick" }}
              className={`flex-1 items-center justify-center py-2 rounded-field ${
                dateMode === "quick" ? "bg-card shadow-xs border border-border" : ""
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
              className={`flex-1 items-center justify-center py-2 rounded-field ${
                dateMode === "calendar" ? "bg-card shadow-xs border border-border" : ""
              }`}
            >
              <Text
                className={`type-body-sm-bold ${
                  dateMode === "calendar" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                📆 Custom Calendar
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
                      isSelected ? "border-info bg-info-subtle" : "border-border bg-card"
                    }`}
                  >
                    <Text
                      className={`type-body-sm-bold ${
                        isSelected ? "text-info" : "text-foreground"
                      }`}
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
            <VStack className="gap-2 rounded-field bg-info-subtle/50 p-3 border border-info/20">
              <Text className="type-caption-bold text-info">Enter Ready Date (YYYY-MM-DD):</Text>
              <AppTextField
                label="Ready Date (YYYY-MM-DD)"
                placeholder="e.g. 2026-09-25"
                value={customDate}
                onChangeText={setCustomDate}
              />
            </VStack>
          )}

          {/* Selected Schedule Display Banner */}
          <HStack className="items-center justify-between rounded-field border border-warning/20 bg-warning-subtle p-3">
            <HStack className="items-center gap-2">
              <Text className="type-body-sm-bold text-warning">⏰ Ready Timeframe:</Text>
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
              <Text className="type-h4 text-foreground font-bold">🚚 Transport Method</Text>
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
              transportType === "shared" ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {/* Top Savings Badge */}
            <View className="self-end mb-2">
              <Box className="rounded-chip bg-warning-subtle border border-warning/30 px-2.5 py-0.5">
                <Text className="type-caption-bold text-warning uppercase tracking-wider">
                  🌿 Saves up to 40%
                </Text>
              </Box>
            </View>

            <HStack className="items-start gap-3">
              <Box
                className={`h-12 w-12 items-center justify-center rounded-field ${
                  transportType === "shared" ? "bg-primary" : "bg-secondary"
                }`}
              >
                <Text className="type-h2">👥</Text>
              </Box>

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
                        : "border-muted-foreground/40 bg-transparent"
                    }`}
                  >
                    {transportType === "shared" && (
                      <Box className="h-2 w-2 rounded-pill bg-primary-foreground" />
                    )}
                  </Box>
                </HStack>

                <Text className="type-caption text-muted-foreground leading-snug">
                  Share truck space with neighbor farms. Eco-friendly & cost effective.
                </Text>

                <HStack className="mt-2 pt-2 border-t border-border items-center gap-1.5">
                  <Text className="type-caption-bold text-primary">
                    🛡️ Escrow locked per volume slot
                  </Text>
                </HStack>
              </VStack>
            </HStack>
          </Pressable>

          {/* Solo Transport Radio Card */}
          <Pressable
            onPress={() => setTransportType("solo")}
            accessibilityRole="radio"
            accessibilityState={{ checked: transportType === "solo" }}
            className={`elevation-card relative flex-col rounded-card border-2 p-4 transition-all ${
              transportType === "solo" ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <HStack className="items-start gap-3">
              <Box
                className={`h-12 w-12 items-center justify-center rounded-field ${
                  transportType === "solo" ? "bg-primary" : "bg-secondary"
                }`}
              >
                <Text className="type-h2">🚚</Text>
              </Box>

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
                        : "border-muted-foreground/40 bg-transparent"
                    }`}
                  >
                    {transportType === "solo" && (
                      <Box className="h-2 w-2 rounded-pill bg-primary-foreground" />
                    )}
                  </Box>
                </HStack>

                <Text className="type-caption text-muted-foreground leading-snug">
                  Dedicated vehicle direct to your farm gate. Faster but costs more.
                </Text>
              </VStack>
            </HStack>
          </Pressable>
        </VStack>

        {/* Community Micro-Delight Callout (Blue Info Card) */}
        <HStack className="items-center gap-3 rounded-card border border-info/30 bg-info-subtle p-3.5">
          <Box className="h-9 w-9 items-center justify-center rounded-pill bg-card border border-info/30">
            <Text className="type-h3">🤝</Text>
          </Box>
          <VStack className="flex-1 min-w-0 gap-0.5">
            <Text className="type-body-sm-bold text-foreground">FarmPool Community Hub</Text>
            <Text className="type-caption text-muted-foreground">
              4 neighbor farms share daily routes to Dambulla.
            </Text>
          </VStack>
        </HStack>
      </ScrollView>

      {/* Standard Sticky Bottom Navigation Bar */}
      <View
        className="border-t border-border bg-card p-gutter gap-2"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <HStack className="gap-2">
          <View className="w-1/3">
            <AppButton label="Back" variant="outline" onPress={onBack} />
          </View>
          <View className="flex-1">
            <AppButton label="Review Listing" onPress={handleContinue} />
          </View>
        </HStack>
      </View>
    </View>
  );
}
