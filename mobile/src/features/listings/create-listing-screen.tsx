import { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import type { CropCategory, CropId } from "@farm-pool/shared";

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
  const [step, setStep] = useState(1);
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

  const handlePublish = () => {
    Alert.alert(
      "Listing Published 🎉",
      "Your harvest batch is now live on FarmPool! Buyers in your region will be notified immediately.",
      [
        {
          text: "View Dashboard",
          onPress: () => router.back()
        }
      ]
    );
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

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
          onBack={handleBack}
          onEditStep={(targetStep) => setStep(targetStep)}
        />
      )}
    </View>
  );
}

export default CreateListingScreen;
