import {
  cropById,
  type CreateListingInput,
  type CropCategory,
  type CropId
} from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { listingsApi } from "@/features/listings/api";
import { toKg } from "@/features/listings/units";
import { formatPrice } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

import Step1CategoryInfo from "./components/create-listing/step-1-category-info";
import Step2Quantity, { type Step2QuantityData } from "./components/create-listing/step-2-quantity";
import Step3HarvestPhotos, {
  type Step3HarvestPhotosData
} from "./components/create-listing/step-3-harvest-photos";
import Step4Price, { type Step4PriceData } from "./components/create-listing/step-4-price";
import Step5Logistics, {
  type Step5LogisticsData
} from "./components/create-listing/step-5-logistics";
import StepReview from "./components/create-listing/step-review";

export function CreateListingScreen() {
  const router = useRouter();
  const auth = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [listingData, setListingData] = useState<{
    category?: CropCategory;
    cropId?: CropId;
    step2?: Step2QuantityData;
    step3?: Step3HarvestPhotosData;
    step4?: Step4PriceData;
    step5?: Step5LogisticsData;
  }>({
    category: "Vegetables",
    cropId: "tomato"
  });

  const handleStep1Next = (data: { category: CropCategory; cropId: CropId }) => {
    setListingData((prev) => ({ ...prev, ...data }));
    setStep(2);
  };

  const handleStep2Next = (data: Step2QuantityData) => {
    setListingData((prev) => ({ ...prev, step2: data }));
    setStep(3);
  };

  const handleStep3Next = (data: Step3HarvestPhotosData) => {
    setListingData((prev) => ({ ...prev, step3: data }));
    setStep(4);
  };

  const handleStep4Next = (data: Step4PriceData) => {
    setListingData((prev) => ({ ...prev, step4: data }));
    setStep(5);
  };

  const handleStep5Next = (data: Step5LogisticsData) => {
    setListingData((prev) => ({ ...prev, step5: data }));
    setStep(6);
  };

  const handlePublish = async () => {
    if (submitting) return; // Prevent duplicate clicks

    const rawQuantity = listingData.step2?.quantity ?? 300;
    const unit = listingData.step2?.unit ?? "kg";
    const totalKg = toKg(rawQuantity, unit);

    const payload: CreateListingInput = {
      cropId: listingData.cropId || "tomato",
      quantityKg: Math.max(1, totalKg),
      unit,
      variety: listingData.step2?.variety || "Standard / Local",
      grade: listingData.step2?.grade || "A",
      packaging: listingData.step2?.packaging,
      certifications: listingData.step2?.certifications,
      pricePerKg: listingData.step4?.pricePerKg ?? 180,
      minOrderKg: listingData.step2?.moqKg,
      harvestDate: listingData.step5?.harvestDate || new Date().toISOString().split("T")[0],
      expiryDays: listingData.step5?.validityDays,
      /* Step 3 only attaches stock sample photos (upload is not built), so none are sent:
         a buyer must never see a stock photo presented as this farmer's harvest. */
      photos: [],
      // Step 5 will not continue without a district, so this is always the farmer's answer.
      district: listingData.step5?.district ?? "",
      fulfillmentOption: listingData.step5?.fulfillmentOption || "shared"
    };

    /* Stay on the review step on any failure, and say why: a farmer told "published" when
       nothing was saved would wait for buyers who can never see the listing. */
    if (!auth.token) {
      setPublishError("You are signed out. Log in again, then publish.");
      return;
    }
    setPublishError(null);
    setSubmitting(true);
    try {
      await listingsApi.create(auth.token, payload);
      setIsPublished(true);
    } catch (e) {
      const detail =
        e instanceof ApiError
          ? (e.issues[0]?.message ?? e.message)
          : "Something went wrong. Check your connection and try again.";
      setPublishError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.replace("/(farmer)/(tabs)/farmer-listings");
    }
  };

  const selectedCrop = cropById(listingData.cropId || "tomato");

  // ── Confirmation View ──────────────────────────────────────────────
  if (isPublished) {
    const rawQuantity = listingData.step2?.quantity ?? 300;
    const unit = listingData.step2?.unit ?? "kg";
    const totalKg = toKg(rawQuantity, unit);

    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerClassName="p-gutter pt-8 pb-32 gap-5">
          {/* Status Icon Header */}
          <VStack className="items-center text-center gap-3">
            <Badge variant="outline" className="bg-warning-subtle border-transparent px-3 py-1">
              <Text className="type-caption-bold text-warning">PENDING COORDINATOR APPROVAL</Text>
            </Badge>

            <Heading className="type-h3 text-foreground text-center">
              Listing Submitted for Review!
            </Heading>

            <Text className="type-body text-muted-foreground text-center px-4">
              Your produce listing has been saved into the database and is currently waiting for
              verification from your regional area coordinator.
            </Text>
          </VStack>

          {/* Listing Batch Details Summary */}
          <Card className="bg-card p-4 border-border gap-3.5">
            <HStack className="items-center gap-3">
              <CropTile emoji={selectedCrop?.emoji ?? "🍅"} />
              <VStack className="flex-1">
                <Text className="type-title text-foreground">
                  Fresh {selectedCrop?.name ?? listingData.cropId}
                </Text>
                <Text className="type-caption text-muted-foreground">
                  {listingData.step5?.district} District
                </Text>
              </VStack>
            </HStack>

            <View className="h-px bg-border" />

            <HStack className="items-center justify-between">
              <VStack>
                <Text className="type-caption text-muted-foreground">Total Supply</Text>
                <Text className="type-body-bold text-foreground">{totalKg} kg</Text>
              </VStack>

              <VStack className="items-end">
                <Text className="type-caption text-muted-foreground">Asking Price</Text>
                <Text className="type-title text-primary">
                  {formatPrice(listingData.step4?.pricePerKg ?? 0)} / kg
                </Text>
              </VStack>
            </HStack>

            <View className="h-px bg-border" />

            <VStack className="gap-1">
              <Text className="type-caption-bold text-muted-foreground">
                Next Steps & Marketplace Verification
              </Text>
              <Text className="type-caption text-muted-foreground">
                1. Area coordinator verifies quality & harvest date.
                {"\n"}
                2. Once approved, buyers can find and order it.
              </Text>
            </VStack>
          </Card>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View
          className="border-t border-border bg-card p-gutter gap-2"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <AppButton
            label="View My Listings"
            onPress={() => router.replace("/(farmer)/(tabs)/farmer-listings")}
          />
          <AppButton
            label="Return to Dashboard"
            variant="outline"
            onPress={() => router.replace("/(farmer)/(tabs)/farmer-home")}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {step === 1 && <Step1CategoryInfo onNext={handleStep1Next} onBack={handleBack} />}
      {step === 2 && (
        <Step2Quantity
          cropId={listingData.cropId || "tomato"}
          initialData={listingData.step2}
          onNext={handleStep2Next}
          onBack={handleBack}
          onChangeCrop={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <Step3HarvestPhotos
          cropId={listingData.cropId || "tomato"}
          batchInfo={{
            quantity: listingData.step2?.quantity ?? 300,
            unit: listingData.step2?.unit ?? "kg",
            grade: listingData.step2?.grade ?? "A",
            variety: listingData.step2?.variety ?? "Roma"
          }}
          initialData={listingData.step3}
          onNext={handleStep3Next}
          onBack={handleBack}
        />
      )}
      {step === 4 && (
        <Step4Price
          cropId={listingData.cropId || "tomato"}
          batchInfo={{
            quantity: listingData.step2?.quantity ?? 300,
            unit: listingData.step2?.unit ?? "kg",
            grade: listingData.step2?.grade ?? "A",
            variety: listingData.step2?.variety ?? "Roma"
          }}
          initialData={listingData.step4}
          onNext={handleStep4Next}
          onBack={handleBack}
        />
      )}
      {step === 5 && (
        <Step5Logistics
          cropId={listingData.cropId || "tomato"}
          batchInfo={{
            quantity: listingData.step2?.quantity ?? 300,
            unit: listingData.step2?.unit ?? "kg",
            grade: listingData.step2?.grade ?? "A",
            variety: listingData.step2?.variety ?? "Roma",
            pricePerKg: listingData.step4?.pricePerKg
          }}
          initialData={listingData.step5}
          onNext={handleStep5Next}
          onBack={handleBack}
        />
      )}
      {step === 6 && (
        <StepReview
          cropId={listingData.cropId || "tomato"}
          step2={listingData.step2}
          step3={listingData.step3}
          step4={listingData.step4}
          step5={listingData.step5}
          onPublish={handlePublish}
          error={publishError}
          onBack={handleBack}
        />
      )}
    </View>
  );
}
