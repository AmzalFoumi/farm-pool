import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image } from "react-native";
import { cropById, type CropId } from "@farm-pool/shared";

import { AppButton } from "@/components/app/app-button";
import { CheckIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { CropTile } from "@/features/listings/crop-tile";

import { SampleBadge } from "./sample-badge";
import { WizardActions, WizardShell } from "./wizard-shell";

export type Step3HarvestPhotosData = {
  widePhotoUri: string | null;
  closeupPhotoUri: string | null;
  packagingPhotoUri: string | null;
};

type Step3HarvestPhotosProps = {
  cropId?: CropId;
  batchInfo?: {
    quantity: number;
    unit: string;
    grade: string;
    variety: string;
  };
  initialData?: Partial<Step3HarvestPhotosData>;
  onNext?: (data: Step3HarvestPhotosData) => void;
  onBack?: () => void;
};

// Default high quality sample harvest images for fast testing
const SAMPLE_IMAGES = {
  wide: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  closeup:
    "https://images.unsplash.com/photo-1546470427-e26264be0b11?w=600&auto=format&fit=crop&q=80",
  packaging:
    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80"
};

export default function Step3HarvestPhotos({
  cropId = "tomato",
  batchInfo = { quantity: 300, unit: "kg", grade: "A", variety: "Roma" },
  initialData,
  onNext,
  onBack
}: Step3HarvestPhotosProps) {
  const { t } = useTranslation();
  const crop = cropById(cropId) || cropById("tomato");

  const [widePhoto, setWidePhoto] = useState<string | null>(initialData?.widePhotoUri ?? null);
  const [closeupPhoto, setCloseupPhoto] = useState<string | null>(
    initialData?.closeupPhotoUri ?? null
  );
  const [packagingPhoto, setPackagingPhoto] = useState<string | null>(
    initialData?.packagingPhotoUri ?? null
  );

  const [sampleGuideKey, setSampleGuideKey] = useState<"wide" | "closeup" | "packaging" | null>(
    null
  );

  const completedCount = (widePhoto ? 1 : 0) + (closeupPhoto ? 1 : 0);
  const isReady = completedCount >= 2;

  const handleAttachSamplePhoto = (slot: "wide" | "closeup" | "packaging") => {
    if (slot === "wide") setWidePhoto(SAMPLE_IMAGES.wide);
    if (slot === "closeup") setCloseupPhoto(SAMPLE_IMAGES.closeup);
    if (slot === "packaging") setPackagingPhoto(SAMPLE_IMAGES.packaging);
  };

  const handleRemovePhoto = (slot: "wide" | "closeup" | "packaging") => {
    if (slot === "wide") setWidePhoto(null);
    if (slot === "closeup") setCloseupPhoto(null);
    if (slot === "packaging") setPackagingPhoto(null);
  };

  const handleContinue = () => {
    if (!isReady) {
      Alert.alert(t("listings.step3.alertTitle"), t("listings.step3.alertBody"));
      return;
    }
    onNext?.({
      widePhotoUri: widePhoto,
      closeupPhotoUri: closeupPhoto,
      packagingPhotoUri: packagingPhoto
    });
  };

  return (
    <WizardShell
      step={3}
      title={t("listings.step3.title")}
      onBack={onBack}
      help={t("listings.step3.help")}
      footer={
        <>
          {" "}
          <HStack className="items-center justify-between px-1">
            <Text className="type-caption text-muted-foreground">
              {t("listings.step3.requiredFooter")}
            </Text>
            <Text
              className={`type-body-bold ${isReady ? "text-primary" : "text-muted-foreground"}`}
            >
              {isReady
                ? t("listings.step3.ready")
                : t("listings.step3.progress", { done: completedCount })}
            </Text>
          </HStack>
          <WizardActions
            onBack={onBack}
            continueLabel={t("common.continue")}
            onContinue={handleContinue}
            continueDisabled={!isReady}
          />
        </>
      }
      overlay={
        <>
          {" "}
          {/* Sample Benchmark Guide Modal */}
          <Modal isOpen={Boolean(sampleGuideKey)} onClose={() => setSampleGuideKey(null)}>
            <ModalBackdrop />
            <ModalContent className="bg-card p-4 rounded-card">
              <ModalHeader>
                <Text className="type-h3 text-foreground">
                  {sampleGuideKey
                    ? t(`listings.step3.guides.${sampleGuideKey}.title`)
                    : t("listings.step3.sampleGuide")}
                </Text>
                <ModalCloseButton />
              </ModalHeader>
              <ModalBody className="gap-3 pt-2">
                {sampleGuideKey && (
                  <>
                    <Box className="h-48 w-full overflow-hidden rounded-field border border-border bg-muted">
                      <Image
                        source={{ uri: SAMPLE_IMAGES[sampleGuideKey] }}
                        className="h-full w-full object-cover"
                      />
                    </Box>
                    <Box className="rounded-card border border-border bg-secondary p-3">
                      <Text className="type-caption text-foreground">
                        {t(`listings.step3.guides.${sampleGuideKey}.desc`)}
                      </Text>
                    </Box>
                  </>
                )}
                <AppButton
                  label={t("listings.step3.gotIt")}
                  onPress={() => setSampleGuideKey(null)}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
        </>
      }
    >
      {/* Batch Produce Summary Card */}
      <HStack className="elevation-card items-center justify-between rounded-card border border-border bg-card p-3">
        <HStack className="flex-1 items-center gap-3">
          <CropTile emoji={crop.emoji} />
          <VStack className="flex-1 min-w-0">
            <Text className="type-body-bold text-foreground" numberOfLines={1}>
              Fresh {t(cropLabelKey(crop.id))}
            </Text>
            <Text className="type-caption text-muted-foreground" numberOfLines={1}>
              Batch: {batchInfo.quantity} {batchInfo.unit} • Grade {batchInfo.grade} •{" "}
              {batchInfo.variety}
            </Text>
          </VStack>
        </HStack>
      </HStack>

      {/* UX Guidance Note Banner */}
      <HStack className="rounded-card bg-brand-deep p-4 items-start gap-3">
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-brand-deep-foreground">
            Photo upload is not built yet
          </Text>
          <Text className="type-caption text-brand-deep-muted">
            {t("listings.step3.sampleNote")}
          </Text>
        </VStack>
      </HStack>

      {/* Section Title & Completion Counter */}
      <HStack className="items-center justify-between px-1">
        <HStack className="items-center gap-2">
          <Text className="type-h4 text-foreground">{t("listings.step3.requiredHeading")}</Text>
        </HStack>

        <Box className="rounded-chip border border-border bg-secondary px-3 py-1">
          <Text
            className={`type-body-sm-bold ${isReady ? "text-primary" : "text-muted-foreground"}`}
          >
            {isReady
              ? t("listings.step3.readyChip")
              : t("listings.step3.uploadedChip", { done: completedCount })}
          </Text>
        </Box>
      </HStack>

      {/* PHOTO SLOT 1: WIDE SHOT (REQUIRED) */}
      <VStack
        className={[
          "elevation-card gap-3 rounded-card border-2 p-4",
          widePhoto ? "border-primary bg-secondary" : "border-dashed border-border bg-card"
        ].join(" ")}
      >
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-2">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground">1. Field / Wide Harvest Shot</Text>
              <Box className="rounded-chip bg-destructive-subtle px-2 py-0.5 border border-destructive">
                <Text className="type-body-sm-bold text-destructive">
                  {t("listings.step3.required")}
                </Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Capture the entire crop pile, crates, or scale of harvest.
            </Text>
          </VStack>

          <Pressable
            onPress={() => setSampleGuideKey("wide")}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-border bg-secondary px-2.5 py-1"
          >
            <Text className="type-body-sm-bold text-secondary-foreground">
              {t("listings.step3.sample")}
            </Text>
          </Pressable>
        </HStack>

        {widePhoto ? (
          <VStack className="gap-2">
            <Box className="h-44 w-full overflow-hidden rounded-field border border-border bg-muted">
              <Image source={{ uri: widePhoto }} className="h-full w-full object-cover" />
              <SampleBadge />
            </Box>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-1">
                <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                  <CheckIcon />
                </Box>
                <Text className="type-body-sm-bold text-primary">
                  {t("listings.step3.wideAttached")}
                </Text>
              </HStack>
              <Pressable
                onPress={() => handleRemovePhoto("wide")}
                accessibilityRole="button"
                className="min-h-tap px-3 justify-center"
              >
                <Text className="type-body-sm-bold text-destructive">
                  {t("listings.step3.remove")}
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        ) : (
          <HStack className="gap-2 pt-1">
            <Pressable
              onPress={() => handleAttachSamplePhoto("wide")}
              accessibilityRole="button"
              className="min-h-tap flex-1 flex-row items-center justify-center gap-1.5 rounded-field border border-border bg-background p-2 active:opacity-80"
            >
              <Text className="type-body-bold text-foreground">
                {t("listings.step3.useSample")}
              </Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {/* PHOTO SLOT 2: CLOSE-UP QUALITY (REQUIRED) */}
      <VStack
        className={[
          "elevation-card gap-3 rounded-card border-2 p-4",
          closeupPhoto ? "border-primary bg-secondary" : "border-dashed border-border bg-card"
        ].join(" ")}
      >
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-2">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground">2. Close-up Produce Quality</Text>
              <Box className="rounded-chip bg-destructive-subtle px-2 py-0.5 border border-destructive">
                <Text className="type-body-sm-bold text-destructive">
                  {t("listings.step3.required")}
                </Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Show skin color, firmness, texture & absence of rot.
            </Text>
          </VStack>

          <Pressable
            onPress={() => setSampleGuideKey("closeup")}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-border bg-secondary px-2.5 py-1"
          >
            <Text className="type-body-sm-bold text-secondary-foreground">
              {t("listings.step3.sample")}
            </Text>
          </Pressable>
        </HStack>

        {closeupPhoto ? (
          <VStack className="gap-2">
            <Box className="h-44 w-full overflow-hidden rounded-field border border-border bg-muted">
              <Image source={{ uri: closeupPhoto }} className="h-full w-full object-cover" />
              <SampleBadge />
            </Box>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-1">
                <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                  <CheckIcon />
                </Box>
                <Text className="type-body-sm-bold text-primary">
                  {t("listings.step3.closeupAttached")}
                </Text>
              </HStack>
              <Pressable
                onPress={() => handleRemovePhoto("closeup")}
                accessibilityRole="button"
                className="min-h-tap px-3 justify-center"
              >
                <Text className="type-body-sm-bold text-destructive">
                  {t("listings.step3.remove")}
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        ) : (
          <HStack className="gap-2 pt-1">
            <Pressable
              onPress={() => handleAttachSamplePhoto("closeup")}
              accessibilityRole="button"
              className="min-h-tap flex-1 flex-row items-center justify-center gap-1.5 rounded-field border border-border bg-background p-2 active:opacity-80"
            >
              <Text className="type-body-bold text-foreground">
                {t("listings.step3.useSample")}
              </Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {/* PHOTO SLOT 3: PACKAGING & CRATES (OPTIONAL) */}
      <VStack
        className={[
          "elevation-card gap-3 rounded-card border-2 p-4",
          packagingPhoto ? "border-primary bg-secondary" : "border-dashed border-border bg-card"
        ].join(" ")}
      >
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-2">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground">3. Packaging / Crates</Text>
              <Box className="rounded-chip bg-muted px-2 py-0.5 border border-border">
                <Text className="type-body-sm-bold text-muted-foreground">
                  {t("listings.step3.optional")}
                </Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Show how produce is stacked or packed in crates.
            </Text>
          </VStack>

          <Pressable
            onPress={() => setSampleGuideKey("packaging")}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-border bg-secondary px-2.5 py-1"
          >
            <Text className="type-body-sm-bold text-secondary-foreground">
              {t("listings.step3.sample")}
            </Text>
          </Pressable>
        </HStack>

        {packagingPhoto ? (
          <VStack className="gap-2">
            <Box className="h-44 w-full overflow-hidden rounded-field border border-border bg-muted">
              <Image source={{ uri: packagingPhoto }} className="h-full w-full object-cover" />
              <SampleBadge />
            </Box>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-1">
                <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                  <CheckIcon />
                </Box>
                <Text className="type-body-sm-bold text-primary">
                  {t("listings.step3.packagingAttached")}
                </Text>
              </HStack>
              <Pressable
                onPress={() => handleRemovePhoto("packaging")}
                accessibilityRole="button"
                className="min-h-tap px-3 justify-center"
              >
                <Text className="type-body-sm-bold text-destructive">
                  {t("listings.step3.remove")}
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        ) : (
          <HStack className="gap-2 pt-1">
            <Pressable
              onPress={() => handleAttachSamplePhoto("packaging")}
              accessibilityRole="button"
              className="min-h-tap flex-1 flex-row items-center justify-center gap-1.5 rounded-field border border-border bg-background p-2 active:opacity-80"
            >
              <Text className="type-body-bold text-foreground">
                {t("listings.step3.useSample")}
              </Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {/* Farmer Photo Tips Card */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <Text className="type-h4 text-foreground">{t("listings.step3.tipsTitle")}</Text>
        <VStack className="gap-2">
          <HStack className="items-start gap-2">
            <Text className="type-body-bold text-secondary-foreground">
              {t("listings.step3.tips.sunLabel")}
            </Text>
            <Text className="type-caption flex-1 text-muted-foreground">
              {t("listings.step3.tips.sunBody")}
            </Text>
          </HStack>
          <HStack className="items-start gap-2">
            <Text className="type-body-bold text-secondary-foreground">
              {t("listings.step3.tips.scaleLabel")}
            </Text>
            <Text className="type-caption flex-1 text-muted-foreground">
              {t("listings.step3.tips.scaleBody")}
            </Text>
          </HStack>
          <HStack className="items-start gap-2">
            <Text className="type-body-bold text-secondary-foreground">
              {t("listings.step3.tips.filterLabel")}
            </Text>
            <Text className="type-caption flex-1 text-muted-foreground">
              {t("listings.step3.tips.filterBody")}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </WizardShell>
  );
}
