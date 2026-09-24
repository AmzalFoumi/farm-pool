import { useState } from "react";
import { Image, View } from "react-native";
import { cropById, type CropId } from "@farm-pool/shared";

import { CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { toKg, type BatchUnit } from "@/features/listings/units";

import type { Step2QuantityData } from "./step-2-quantity";
import type { Step3HarvestPhotosData } from "./step-3-harvest-photos";
import type { Step4PriceData } from "./step-4-price";
import type { Step5LogisticsData } from "./step-5-logistics";

import { WizardActions, WizardShell } from "./wizard-shell";

type StepReviewProps = {
  cropId?: CropId;
  step2?: Step2QuantityData;
  step3?: Step3HarvestPhotosData;
  step4?: Step4PriceData;
  step5?: Step5LogisticsData;
  /** Resolves when the api has answered, success or failure; the parent reports the outcome. */
  onPublish?: () => Promise<void>;
  /** Why the last publish failed, shown above the buttons; null when there is nothing to say. */
  error?: string | null;
  onBack?: () => void;
  onEditStep?: (step: number) => void;
};

export default function StepReview({
  cropId = "tomato",
  step2 = {
    quantity: 300,
    unit: "kg",
    grade: "A",
    variety: "Roma / Plum",
    moqKg: 50,
    packaging: "Plastic Crates (25kg)",
    certifications: ["GAP Verified"]
  },
  step3 = { widePhotoUri: null, closeupPhotoUri: null, packagingPhotoUri: null },
  step4 = { pricePerKg: 195, grossEarnings: 58500 },
  step5 = {
    fulfillmentOption: "shared",
    harvestDate: "05 Nov 2026",
    validityDays: 5,
    district: "Dambulla"
  },
  onPublish,
  error,
  onBack,
  onEditStep
}: StepReviewProps) {
  const crop = cropById(cropId) || cropById("tomato");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalQuantity = step2.quantity > 0 ? step2.quantity : 300;
  const askingPrice = step4.pricePerKg > 0 ? step4.pricePerKg : 195;
  const grossEarnings = askingPrice * toKg(totalQuantity, step2.unit);

  const photoUris = [step3?.widePhotoUri, step3?.closeupPhotoUri, step3?.packagingPhotoUri].filter(
    (uri): uri is string => typeof uri === "string" && uri.length > 0
  );

  const mainPhotoUri = photoUris[0] ?? null;

  const handleConfirmPublish = async () => {
    setIsSubmitting(true);
    try {
      await onPublish?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFulfillmentLabel = () => {
    switch (step5.fulfillmentOption) {
      case "solo":
        return "Solo Transport";
      case "shared":
      case "hub_delivery":
      case "farmpool_transport":
      case "pickup":
      default:
        return "Shared Transport";
    }
  };

  return (
    <WizardShell
      step={"review"}
      title="Review & Publish"
      onBack={onBack}
      footer={
        <>
          {" "}
          {error ? (
            <Text className="type-caption text-destructive" accessibilityRole="alert">
              Could not publish: {error}
            </Text>
          ) : null}
          <WizardActions
            onBack={onBack}
            backLabel="✏ Edit"
            continueLabel={isSubmitting ? "Publishing..." : "Publish Listing 🚀"}
            onContinue={handleConfirmPublish}
            continueDisabled={isSubmitting}
          />
        </>
      }
    >
      {/* Unified Review Card */}
      <VStack className="elevation-card overflow-hidden rounded-card border border-border bg-card">
        {/* Top zone: Produce Highlight */}
        <HStack className="p-4 items-center gap-4">
          {/* Main Thumbnail */}
          <View className="relative h-20 w-20 overflow-hidden rounded-field border border-border bg-secondary justify-center items-center">
            {mainPhotoUri ? (
              <Image source={{ uri: mainPhotoUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <CropTile emoji={crop.emoji} />
            )}
            <Box className="absolute bottom-1 right-1 rounded-chip bg-brand-deep/85 px-1.5 py-0.5">
              <Text className="type-caption-bold text-white text-[10px]">
                {totalQuantity} {step2.unit || "KG"}
              </Text>
            </Box>
          </View>

          {/* Produce Details */}
          <VStack className="flex-1 min-w-0 gap-1">
            <HStack className="items-center justify-between">
              <Text className="type-h3 text-foreground font-bold flex-1" numberOfLines={1}>
                Fresh {crop.name}
              </Text>
              <Box className="rounded-chip bg-secondary border border-primary/20 px-2 py-0.5">
                <Text className="type-caption-bold text-primary">Ready</Text>
              </Box>
            </HStack>

            <Text className="type-caption text-muted-foreground">
              Total Volume:{" "}
              <Text className="type-caption-bold text-foreground">
                {totalQuantity} {step2.unit || "kg"}
              </Text>
            </Text>

            <HStack className="items-baseline justify-between pt-1">
              <HStack className="items-baseline gap-1">
                <Text className="type-h2 text-primary font-bold">Rs. {askingPrice}</Text>
                <Text className="type-caption text-muted-foreground">/kg</Text>
              </HStack>

              <Box className="rounded-chip bg-secondary px-2 py-1">
                <Text className="type-caption-bold text-primary">
                  Est. Rs. {grossEarnings.toLocaleString()}
                </Text>
              </Box>
            </HStack>
          </VStack>
        </HStack>

        {/* Middle Separator */}
        <Box className="h-1.5 w-full bg-background border-y border-border/40" />

        {/* Specification Details Zone */}
        <VStack className="p-4 gap-3">
          {/* Quality Grade */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">⭐ Quality Grade</Text>
            </HStack>
            <HStack className="items-center gap-2">
              <Text className="type-body-sm-bold text-foreground">Grade {step2.grade || "A"}</Text>
              <Box className="h-6 w-6 items-center justify-center rounded-pill bg-primary">
                <Text className="type-caption-bold text-primary-foreground">
                  {step2.grade || "A"}
                </Text>
              </Box>
            </HStack>
          </HStack>

          <Box className="h-px w-full bg-border/40" />

          {/* Variety */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">🏷️ {crop.name} Variety</Text>
            </HStack>
            <Text className="type-body-sm-bold text-foreground">
              {step2.variety || "Roma / Plum"}
            </Text>
          </HStack>

          <Box className="h-px w-full bg-border/40" />

          {/* Scheduled Date */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">📅 Scheduled Date</Text>
            </HStack>
            <HStack className="items-center gap-1.5">
              <Text className="type-body-sm-bold text-foreground">
                {step5.harvestDate || "05 Nov 2026"}
              </Text>
              <Text className="type-caption text-primary">✓</Text>
            </HStack>
          </HStack>

          <Box className="h-px w-full bg-border/40" />

          {/* Packaging */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">📦 Packaging</Text>
            </HStack>
            <Text className="type-body-sm-bold text-foreground">
              {step2.packaging || "Plastic Crates (25kg)"}
            </Text>
          </HStack>

          <Box className="h-px w-full bg-border/40" />

          {/* Transportation */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">🚚 Transportation</Text>
            </HStack>
            <Box className="rounded-chip bg-secondary px-2.5 py-1">
              <Text className="type-caption-bold text-primary">👥 {getFulfillmentLabel()}</Text>
            </Box>
          </HStack>

          <Box className="h-px w-full bg-border/40" />

          {/* Dropoff Hub */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">📍 District</Text>
            </HStack>
            <Text className="type-body-sm-bold text-foreground">{step5.district}</Text>
          </HStack>

          <Box className="h-px w-full bg-border/40" />

          {/* Harvest Photos Mini-Gallery */}
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-caption text-muted-foreground">🖼️ Harvest Photos</Text>
            </HStack>
            <HStack className="items-center gap-1.5">
              {photoUris.length > 0 ? (
                photoUris.map((uri: string, idx: number) => (
                  <View
                    key={idx}
                    className="h-8 w-8 overflow-hidden rounded-field border border-border bg-muted"
                  >
                    <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
                  </View>
                ))
              ) : (
                <Text className="type-caption text-muted-foreground">None attached</Text>
              )}
            </HStack>
          </HStack>
        </VStack>
      </VStack>

      {/* Trust Banner 1: Verified Network */}
      <HStack className="rounded-card bg-secondary/40 p-4 items-start gap-3.5 border border-border">
        <Box className="h-10 w-10 items-center justify-center rounded-pill bg-card border border-border text-primary shadow-xs">
          <Text className="type-h3">🛡️</Text>
        </Box>
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground">Verified Network Visibility</Text>
          <Text className="type-caption text-muted-foreground leading-relaxed">
            Your listing will instantly alert{" "}
            <Text className="type-caption-bold text-primary">340+ verified wholesale buyers</Text>{" "}
            across Sri Lanka.
          </Text>
        </VStack>
      </HStack>

      {/* Trust Banner 2: Escrow Guarantee */}
      <HStack className="rounded-card bg-warning-subtle p-4 items-start gap-3.5 border border-warning/20">
        <Box className="h-10 w-10 items-center justify-center rounded-pill bg-card border border-warning/20 text-warning shadow-xs">
          <Text className="type-h3">🔒</Text>
        </Box>
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground">100% Guaranteed Payout</Text>
          <Text className="type-caption text-muted-foreground leading-relaxed">
            Funds are secured in{" "}
            <Text className="type-caption-bold text-warning">FarmPool Escrow</Text> the moment a
            buyer bids on your batch.
          </Text>
        </VStack>
      </HStack>
    </WizardShell>
  );
}
