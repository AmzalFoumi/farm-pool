import { useState } from "react";
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
import { CropTile } from "@/features/listings/crop-tile";

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

const SAMPLE_GUIDES = {
  wide: {
    title: "1. Field / Wide Harvest Shot",
    desc: "Stand 2-3 meters back from harvest pile or crate stack. Ensure natural sunlight is behind you so the whole yield is visible."
  },
  closeup: {
    title: "2. Close-up Produce Quality",
    desc: "Hold camera 20cm away from individual produce. Focus clearly on skin texture, color firmness, and fresh condition."
  },
  packaging: {
    title: "3. Packaging / Crates",
    desc: "Show produce neatly packed inside standard 25kg plastic crates, wooden boxes, or sacks ready for transport loading."
  }
};

export default function Step3HarvestPhotos({
  cropId = "tomato",
  batchInfo = { quantity: 300, unit: "kg", grade: "A", variety: "Roma" },
  initialData,
  onNext,
  onBack
}: Step3HarvestPhotosProps) {
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
      Alert.alert(
        "Photos Required",
        "Please attach both Wide shot and Close-up quality photos to proceed."
      );
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
      title="Add Harvest Photos"
      onBack={onBack}
      help="Attach clear photos of your harvest. Wholesale buyers check clarity & natural lighting before placing bids."
      footer={
        <>
          {" "}
          <HStack className="items-center justify-between px-1">
            <Text className="type-caption text-muted-foreground">Required Photos:</Text>
            <Text className={`type-body-bold ${isReady ? "text-success" : "text-warning"}`}>
              {isReady ? "2/2 Ready" : `${completedCount}/2 Completed`}
            </Text>
          </HStack>
          <WizardActions
            onBack={onBack}
            continueLabel="Continue"
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
                  {sampleGuideKey ? SAMPLE_GUIDES[sampleGuideKey].title : "Sample Guide"}
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
                    <Box className="rounded-card border border-info/30 bg-info-subtle p-3">
                      <Text className="type-caption text-foreground">
                        {SAMPLE_GUIDES[sampleGuideKey].desc}
                      </Text>
                    </Box>
                  </>
                )}
                <AppButton label="Got It, Thanks!" onPress={() => setSampleGuideKey(null)} />
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
              Fresh {crop.name}
            </Text>
            <Text className="type-caption text-muted-foreground" numberOfLines={1}>
              Batch: {batchInfo.quantity} {batchInfo.unit} • Grade {batchInfo.grade} •{" "}
              {batchInfo.variety}
            </Text>
          </VStack>
        </HStack>

        <Box className="rounded-chip bg-info-subtle border border-info/20 px-2 py-1">
          <Text className="type-body-sm-bold text-info">Verified</Text>
        </Box>
      </HStack>

      {/* UX Guidance Note Banner */}
      <HStack className="rounded-card bg-brand-deep p-4 items-start gap-3 shadow-sm">
        <Box className="h-9 w-9 items-center justify-center rounded-field bg-white/10">
          <Text className="type-h4">📸</Text>
        </Box>
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-brand-deep-foreground">
            Clear Photos = Faster Sales
          </Text>
          <Text className="type-caption text-brand-deep-muted">
            Wholesale buyers in Dambulla & Colombo check clarity & natural lighting before making
            bids.
          </Text>
        </VStack>
      </HStack>

      {/* Section Title & Completion Counter */}
      <HStack className="items-center justify-between px-1">
        <HStack className="items-center gap-2">
          <Text className="type-h4 text-foreground">Required Photos</Text>
        </HStack>

        <Box
          className={[
            "rounded-chip px-3 py-1 border",
            isReady ? "bg-success-subtle border-success/30" : "bg-warning-subtle border-warning/30"
          ].join(" ")}
        >
          <Text className={`type-body-sm-bold ${isReady ? "text-success" : "text-warning"}`}>
            {isReady ? "✓ 2 of 2 Ready" : `${completedCount} of 2 Uploaded`}
          </Text>
        </Box>
      </HStack>

      {/* PHOTO SLOT 1: WIDE SHOT (REQUIRED) */}
      <VStack
        className={[
          "elevation-card gap-3 rounded-card border-2 p-4",
          widePhoto ? "border-primary bg-secondary/20" : "border-dashed border-border bg-card"
        ].join(" ")}
      >
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-2">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground">1. Field / Wide Harvest Shot</Text>
              <Box className="rounded-chip bg-destructive-subtle px-2 py-0.5 border border-destructive/20">
                <Text className="type-body-sm-bold text-destructive">Required</Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Capture the entire crop pile, crates, or scale of harvest.
            </Text>
          </VStack>

          <Pressable
            onPress={() => setSampleGuideKey("wide")}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-info/30 bg-info-subtle px-2.5 py-1"
          >
            <Text className="type-body-sm-bold text-info">👁 Sample</Text>
          </Pressable>
        </HStack>

        {widePhoto ? (
          <VStack className="gap-2">
            <Box className="h-44 w-full overflow-hidden rounded-field border border-border bg-muted">
              <Image source={{ uri: widePhoto }} className="h-full w-full object-cover" />
            </Box>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-1">
                <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                  <CheckIcon />
                </Box>
                <Text className="type-body-sm-bold text-primary">Wide Shot Attached</Text>
              </HStack>
              <Pressable
                onPress={() => handleRemovePhoto("wide")}
                accessibilityRole="button"
                className="min-h-tap px-3 justify-center"
              >
                <Text className="type-body-sm-bold text-destructive">Remove</Text>
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
              <Text className="type-body-bold text-foreground">📷 Take Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAttachSamplePhoto("wide")}
              accessibilityRole="button"
              className="min-h-tap flex-1 flex-row items-center justify-center gap-1.5 rounded-field border border-border bg-background p-2 active:opacity-80"
            >
              <Text className="type-body-bold text-foreground">🖼 Gallery</Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {/* PHOTO SLOT 2: CLOSE-UP QUALITY (REQUIRED) */}
      <VStack
        className={[
          "elevation-card gap-3 rounded-card border-2 p-4",
          closeupPhoto ? "border-primary bg-secondary/20" : "border-dashed border-border bg-card"
        ].join(" ")}
      >
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-2">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground">2. Close-up Produce Quality</Text>
              <Box className="rounded-chip bg-destructive-subtle px-2 py-0.5 border border-destructive/20">
                <Text className="type-body-sm-bold text-destructive">Required</Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Show skin color, firmness, texture & absence of rot.
            </Text>
          </VStack>

          <Pressable
            onPress={() => setSampleGuideKey("closeup")}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-info/30 bg-info-subtle px-2.5 py-1"
          >
            <Text className="type-body-sm-bold text-info">👁 Sample</Text>
          </Pressable>
        </HStack>

        {closeupPhoto ? (
          <VStack className="gap-2">
            <Box className="h-44 w-full overflow-hidden rounded-field border border-border bg-muted">
              <Image source={{ uri: closeupPhoto }} className="h-full w-full object-cover" />
            </Box>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-1">
                <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                  <CheckIcon />
                </Box>
                <Text className="type-body-sm-bold text-primary">Close-up Attached</Text>
              </HStack>
              <Pressable
                onPress={() => handleRemovePhoto("closeup")}
                accessibilityRole="button"
                className="min-h-tap px-3 justify-center"
              >
                <Text className="type-body-sm-bold text-destructive">Remove</Text>
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
              <Text className="type-body-bold text-foreground">📷 Take Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAttachSamplePhoto("closeup")}
              accessibilityRole="button"
              className="min-h-tap flex-1 flex-row items-center justify-center gap-1.5 rounded-field border border-border bg-background p-2 active:opacity-80"
            >
              <Text className="type-body-bold text-foreground">🖼 Gallery</Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {/* PHOTO SLOT 3: PACKAGING & CRATES (OPTIONAL) */}
      <VStack
        className={[
          "elevation-card gap-3 rounded-card border-2 p-4",
          packagingPhoto ? "border-primary bg-secondary/20" : "border-dashed border-border bg-card"
        ].join(" ")}
      >
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-2">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground">3. Packaging / Crates</Text>
              <Box className="rounded-chip bg-muted px-2 py-0.5 border border-border">
                <Text className="type-body-sm-bold text-muted-foreground">Optional</Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground">
              Show how produce is stacked or packed in crates.
            </Text>
          </VStack>

          <Pressable
            onPress={() => setSampleGuideKey("packaging")}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-info/30 bg-info-subtle px-2.5 py-1"
          >
            <Text className="type-body-sm-bold text-info">👁 Sample</Text>
          </Pressable>
        </HStack>

        {packagingPhoto ? (
          <VStack className="gap-2">
            <Box className="h-44 w-full overflow-hidden rounded-field border border-border bg-muted">
              <Image source={{ uri: packagingPhoto }} className="h-full w-full object-cover" />
            </Box>
            <HStack className="items-center justify-between">
              <HStack className="items-center gap-1">
                <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                  <CheckIcon />
                </Box>
                <Text className="type-body-sm-bold text-primary">Packaging Attached</Text>
              </HStack>
              <Pressable
                onPress={() => handleRemovePhoto("packaging")}
                accessibilityRole="button"
                className="min-h-tap px-3 justify-center"
              >
                <Text className="type-body-sm-bold text-destructive">Remove</Text>
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
              <Text className="type-body-bold text-foreground">📷 Camera</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAttachSamplePhoto("packaging")}
              accessibilityRole="button"
              className="min-h-tap flex-1 flex-row items-center justify-center gap-1.5 rounded-field border border-border bg-background p-2 active:opacity-80"
            >
              <Text className="type-body-bold text-foreground">🖼 Gallery</Text>
            </Pressable>
          </HStack>
        )}
      </VStack>

      {/* Farmer Photo Tips Card */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <Text className="type-h4 text-foreground">💡 Tips for Sri Lankan Farmers</Text>
        <VStack className="gap-2">
          <HStack className="items-start gap-2">
            <Text className="type-body-bold text-info">☀️ Use Sunlight:</Text>
            <Text className="type-caption flex-1 text-muted-foreground">
              Shoot outdoors under daylight instead of dim indoor rooms.
            </Text>
          </HStack>
          <HStack className="items-start gap-2">
            <Text className="type-body-bold text-info">📏 Show Real Scale:</Text>
            <Text className="type-caption flex-1 text-muted-foreground">
              Place a 25kg crate next to produce for buyer scale context.
            </Text>
          </HStack>
          <HStack className="items-start gap-2">
            <Text className="type-body-bold text-info">🚫 No Filters:</Text>
            <Text className="type-caption flex-1 text-muted-foreground">
              Buyers need authentic photos without artificial color editing.
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </WizardShell>
  );
}
