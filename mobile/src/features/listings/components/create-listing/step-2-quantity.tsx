import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { cropById, type CropId, type ListingGrade, type ListingPackaging } from "@farm-pool/shared";

import { AppTextField } from "@/components/app/app-text-field";
import { CheckIcon } from "@/components/app/icons";
import { NumericKeypadModal } from "@/components/app/numeric-keypad-modal";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { CropTile } from "@/features/listings/crop-tile";
import { toKg, type BatchUnit } from "@/features/listings/units";

import { WizardActions, WizardShell } from "./wizard-shell";

export type Step2QuantityData = {
  quantity: number;
  unit: BatchUnit;
  moqKg?: number;
  variety: string;
  grade: ListingGrade;
  packaging: ListingPackaging;
  certifications: string[];
};

type Step2QuantityProps = {
  cropId?: CropId;
  initialData?: Partial<Step2QuantityData>;
  onNext?: (data: Step2QuantityData) => void;
  onBack?: () => void;
  onChangeCrop?: () => void;
};

/* Grade copy lives in `listings.grades.*`; the ids A/B/C are the stored values. */
const GRADE_IDS = ["A", "B", "C"] as const;

/* Ids only: the label is `listings.packaging.<id>`, the id is what the listing stores. */
const PACKAGING_IDS: ListingPackaging[] = ["plastic-crate", "wooden-box", "cardboard", "mesh-bag"];

/* These strings ARE the stored values (`listing.certifications`), so they stay English here and
   are translated for display through `listings.certifications.<value>`. */
const CERTIFICATION_OPTIONS = ["Organic Certified", "GAP Certified", "Pesticide-Free"];

export default function Step2Quantity({
  cropId = "tomato",
  initialData,
  onNext,
  onBack,
  onChangeCrop
}: Step2QuantityProps) {
  const { t } = useTranslation();
  const crop = cropById(cropId) || cropById("tomato");
  /* Variety names are cultivars ("Roma"), i.e. proper nouns that stay as they are; only the
     generic fallback is a UI string. It is also the stored value, so it stays English. */
  const defaultVariety = crop.varieties?.[0] || "Standard / Local";

  // Initial quantity defaults to 0 as requested so farmer types their supply
  const [quantity, setQuantity] = useState<number>(initialData?.quantity ?? 0);
  const [unit, setUnit] = useState<"kg" | "crates" | "sacks">(initialData?.unit ?? "kg");

  // MOQ state; undefined means no minimum, which is the default
  const [moqKg, setMoqKg] = useState<number | undefined>(initialData?.moqKg);
  const [isCustomMoq, setIsCustomMoq] = useState<boolean>(false);
  const [customMoqText, setCustomMoqText] = useState<string>("20");

  // Keypad modal state
  const [isKeypadVisible, setIsKeypadVisible] = useState<boolean>(false);

  const [variety, setVariety] = useState<string>(initialData?.variety ?? defaultVariety);
  const [grade, setGrade] = useState<ListingGrade>(initialData?.grade ?? "A");
  const [packaging, setPackaging] = useState<ListingPackaging>(
    initialData?.packaging ?? PACKAGING_IDS[0]
  );
  const [certifications, setCertifications] = useState<string[]>(
    initialData?.certifications ?? ["Organic Certified"]
  );

  // Conversion calculations
  const totalKg = toKg(quantity, unit);
  const isBelowMoq = quantity <= 0 || (moqKg !== undefined && totalKg < moqKg);

  const handleAdjustQuantity = (delta: number) => {
    const step = unit === "kg" ? delta : delta > 0 ? 1 : -1;
    const newQty = Math.max(0, quantity + step);
    setQuantity(newQty);
  };

  const handleSelectUnit = (newUnit: "kg" | "crates" | "sacks") => {
    setUnit(newUnit);
  };

  const handleSelectMoq = (val: number | undefined) => {
    setIsCustomMoq(false);
    setMoqKg(val);
  };

  const handleCustomMoqChange = (text: string) => {
    setCustomMoqText(text);
    const parsed = parseInt(text.replace(/[^0-9]/g, ""), 10);
    const validVal = isNaN(parsed) ? 1 : Math.max(1, parsed);
    setMoqKg(validVal);
  };

  const openKeypad = () => {
    setIsKeypadVisible(true);
  };

  const toggleCertification = (cert: string) => {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleContinue = () => {
    if (isBelowMoq) return;
    onNext?.({
      quantity,
      unit,
      moqKg,
      variety,
      grade,
      packaging,
      certifications
    });
  };

  return (
    <WizardShell
      step={2}
      title={t("listings.step2.title")}
      onBack={onBack}
      help={t("listings.step2.help")}
      footer={
        <>
          {" "}
          <HStack className="items-center justify-between px-1">
            <Text className="type-caption text-muted-foreground">
              {t("listings.step2.batchSummary")}
            </Text>
            <Text className="type-body-bold text-foreground">
              {t("listings.step2.summaryValue", {
                quantity,
                unit: t(`listings.units.${unit}`),
                grade,
                variety
              })}
            </Text>
          </HStack>
          <WizardActions
            onBack={onBack}
            continueLabel={t("common.continue")}
            onContinue={handleContinue}
            continueDisabled={isBelowMoq}
          />
        </>
      }
      overlay={
        <>
          {" "}
          {/* Reusable Keypad Entry Modal */}
          <NumericKeypadModal
            isOpen={isKeypadVisible}
            onClose={() => setIsKeypadVisible(false)}
            title={t("listings.step2.enterTotal")}
            initialValue={quantity}
            unitLabel={unit}
            presets={[50, 100, 250, 500]}
            onConfirm={setQuantity}
          />
        </>
      }
    >
      {/* Selected Crop Summary Card */}
      <HStack className="elevation-card items-center justify-between rounded-card border border-border bg-card p-3">
        <HStack className="flex-1 items-center gap-3">
          <CropTile emoji={crop.emoji} />
          <VStack className="flex-1 min-w-0">
            <HStack className="items-center gap-2 flex-wrap">
              <Text className="type-body-bold text-foreground" numberOfLines={1}>
                Fresh {t(cropLabelKey(crop.id))}
              </Text>
              <Box className="rounded-chip bg-secondary px-2 py-0.5">
                <Text className="type-body-sm-bold text-secondary-foreground">{crop.category}</Text>
              </Box>
            </HStack>
            <Text className="type-caption text-muted-foreground" numberOfLines={1}>
              {t("listings.step2.specify")}
            </Text>
          </VStack>
        </HStack>

        <Pressable
          onPress={onChangeCrop || onBack}
          accessibilityRole="button"
          className="min-h-tap px-2 justify-center"
        >
          <Text className="type-body-bold text-primary">{t("listings.step2.change")}</Text>
        </Pressable>
      </HStack>

      {/* Total Supply Quantity Section */}
      <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
        <HStack className="items-center justify-between">
          <Text className="type-h4 text-foreground">{t("listings.step2.totalSupply")}</Text>
          <Pressable
            onPress={openKeypad}
            accessibilityRole="button"
            className="min-h-tap flex-row items-center gap-1 rounded-chip border border-border bg-secondary px-3 py-1"
          >
            <Text className="type-body-sm-bold text-secondary-foreground">
              {t("listings.step2.keypad")}
            </Text>
          </Pressable>
        </HStack>

        {/* Stepper Display — Big Green Box with - and + Buttons */}
        <HStack className="items-center justify-between rounded-card border border-primary bg-secondary p-3">
          <Pressable
            onPress={() => handleAdjustQuantity(-10)}
            accessibilityRole="button"
            accessibilityLabel={t("listings.step2.decrease")}
            className="h-tap w-tap items-center justify-center rounded-field border border-primary bg-card active:opacity-80"
          >
            <Text className="type-h2 text-primary">-</Text>
          </Pressable>

          {/* Center Number as <Text> wrapped in <Pressable> (toggles keypad modal) */}
          <Pressable
            onPress={openKeypad}
            accessibilityRole="button"
            accessibilityLabel={t("listings.step2.openKeypad")}
            className="min-h-tap flex-1 items-center px-2 py-1 active:opacity-80"
          >
            <HStack className="items-baseline justify-center gap-1.5">
              <Text className="type-display text-secondary-foreground">{quantity}</Text>
              <Text className="type-h3 text-secondary-foreground">{unit}</Text>
            </HStack>
            <Text className="type-caption text-secondary-foreground text-center">
              {t("listings.step2.tapKeypad")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleAdjustQuantity(10)}
            accessibilityRole="button"
            accessibilityLabel={t("listings.step2.increase")}
            className="h-tap w-tap items-center justify-center rounded-field border border-primary bg-card active:opacity-80"
          >
            <Text className="type-h2 text-primary">+</Text>
          </Pressable>
        </HStack>

        {/* Unit Switcher */}
        <VStack className="gap-2 border-t border-border pt-3">
          <Text className="type-caption text-muted-foreground">
            {t("listings.step2.unitFormat")}
          </Text>
          <HStack className="flex-row flex-wrap gap-2">
            {(["kg", "crates", "sacks"] as const).map((u) => {
              const isSelected = unit === u;
              const label = t(`listings.units.${u}`);
              const sub = t(
                u === "kg"
                  ? "listings.step2.unitSubKg"
                  : u === "crates"
                    ? "listings.step2.unitSubCrates"
                    : "listings.step2.unitSubSacks"
              );

              return (
                <Pressable
                  key={u}
                  onPress={() => handleSelectUnit(u)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={[
                    "min-h-tap flex-1 min-w-[30%] items-center justify-center rounded-field border p-2",
                    isSelected ? "border-primary bg-primary" : "border-border bg-card"
                  ].join(" ")}
                >
                  <Text
                    className={`type-body-sm-bold ${
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    }`}
                  >
                    {label}
                  </Text>
                  <Text
                    className={`type-caption ${
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {sub}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </VStack>

        {/* Weight Conversion Banner */}
        {unit !== "kg" && quantity > 0 && (
          <HStack className="items-center justify-between rounded-card border border-border bg-secondary p-3">
            <Text className="type-caption text-foreground">{t("listings.step2.totalWeight")}</Text>
            <Text className="type-body-bold text-primary">
              {totalKg.toLocaleString()} kg ({quantity} {unit})
            </Text>
          </HStack>
        )}
      </VStack>

      {/* Minimum Order Quantity (MOQ) Section */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <HStack className="items-center justify-between">
          <VStack className="flex-1">
            <Text className="type-h4 text-foreground">{t("listings.step2.moq")}</Text>
            <Text className="type-caption text-muted-foreground">
              {t("listings.step2.smallestVolume")}
            </Text>
          </VStack>

          <Box className="rounded-pill bg-secondary px-3 py-1 border border-border">
            <Text className="type-body-sm-bold text-secondary-foreground">
              {moqKg === undefined
                ? t("listings.step2.noMinimum")
                : t("listings.step2.min", { kg: moqKg })}
            </Text>
          </Box>
        </HStack>

        {/* Presets Grid */}
        <VStack className="gap-2">
          <Text className="type-caption-bold uppercase text-muted-foreground">
            {t("listings.step2.quickPresets")}
          </Text>
          <HStack className="flex-row flex-wrap gap-2">
            {[undefined, 20, 50, 100].map((preset) => {
              const isSelected = !isCustomMoq && moqKg === preset;

              return (
                <Pressable
                  key={preset ?? "none"}
                  onPress={() => handleSelectMoq(preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={[
                    "min-h-tap flex-1 min-w-[20%] items-center justify-center rounded-chip border p-2",
                    isSelected ? "border-primary bg-secondary" : "border-border bg-card"
                  ].join(" ")}
                >
                  <Text
                    className={`type-body-sm-bold ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {preset === undefined
                      ? t("listings.step2.none")
                      : t("listings.step2.kgValue", { kg: preset })}
                  </Text>
                </Pressable>
              );
            })}

            {/* Custom Preset Button */}
            <Pressable
              onPress={() => setIsCustomMoq(true)}
              accessibilityRole="button"
              accessibilityState={{ selected: isCustomMoq }}
              className={[
                "min-h-tap flex-1 min-w-[20%] flex-row items-center justify-center gap-1 rounded-chip border p-2",
                isCustomMoq ? "border-primary bg-primary" : "border-border bg-card"
              ].join(" ")}
            >
              <Text
                className={`type-body-sm-bold ${
                  isCustomMoq ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {t("listings.step2.custom")}
              </Text>
            </Pressable>
          </HStack>

          {/* Custom MOQ Input Field when Custom preset selected */}
          {isCustomMoq && (
            <AppTextField
              label={t("listings.step2.customMoq")}
              value={customMoqText}
              onChangeText={handleCustomMoqChange}
              keyboardType="numeric"
              placeholder={t("listings.step2.moqPlaceholder")}
            />
          )}
        </VStack>

        {/* MOQ / Quantity Warnings */}
        {quantity <= 0 ? (
          <VStack className="rounded-card border border-border bg-secondary p-3 gap-1">
            <Text className="type-body-bold text-secondary-foreground">
              {t("listings.step2.enterSupply")}
            </Text>
            <Text className="type-caption text-foreground">
              {t("listings.step2.quantityError")}
            </Text>
          </VStack>
        ) : isBelowMoq ? (
          <VStack className="rounded-card border border-destructive bg-destructive-subtle p-3 gap-1">
            <Text className="type-body-bold text-destructive">{t("listings.step2.belowMin")}</Text>
            <Text className="type-caption text-destructive">
              Total supply ({totalKg} kg) is less than Minimum Order limit ({moqKg} kg).
            </Text>
          </VStack>
        ) : null}
      </VStack>

      {/* Variety Section (Dynamic based on selected Crop!) */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <Text className="type-h4 text-foreground">
          {t("listings.step2.varietyHeading", { crop: t(cropLabelKey(crop.id)) })}
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {(crop.varieties || [t("listings.step2.defaultVariety")]).map((v) => {
            const isSelected = variety === v;

            return (
              <Pressable
                key={v}
                onPress={() => setVariety(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={[
                  "min-h-tap flex-1 min-w-[45%] flex-row items-center justify-between rounded-field border px-3 py-2",
                  isSelected ? "border-primary bg-secondary" : "border-border bg-card"
                ].join(" ")}
              >
                <Text
                  className={`type-body-bold flex-1 ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                  numberOfLines={1}
                >
                  {v}
                </Text>
                {isSelected && (
                  <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                    <CheckIcon />
                  </Box>
                )}
              </Pressable>
            );
          })}
        </View>
      </VStack>

      {/* Quality Grade Section */}
      <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
        <HStack className="items-center justify-between">
          <VStack>
            <Text className="type-h4 text-foreground">{t("listings.step2.qualityGrade")}</Text>
            <Text className="type-caption text-muted-foreground">
              {t("listings.step2.gradeNote")}
            </Text>
          </VStack>

          <Box className="rounded-field bg-brand-deep px-3 py-1">
            <Text className="type-body-sm-bold text-brand-deep-foreground">
              {t("listings.step2.gradeChip", { grade })}
            </Text>
          </Box>
        </HStack>

        <HStack className="rounded-card border border-border bg-background p-1 gap-1">
          {GRADE_IDS.map((g) => {
            const isSelected = grade === g;

            return (
              <Pressable
                key={g}
                onPress={() => setGrade(g)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={[
                  "min-h-tap flex-1 items-center justify-center rounded-field",
                  isSelected ? "bg-primary" : "bg-transparent"
                ].join(" ")}
              >
                <Text
                  className={`type-body-bold ${
                    isSelected ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t("listings.step2.gradeChip", { grade: g })}
                </Text>
              </Pressable>
            );
          })}
        </HStack>

        <VStack className="rounded-card border border-border bg-secondary p-3 gap-1">
          <Text className="type-body-bold text-primary">{t(`listings.grades.${grade}.title`)}</Text>
          <Text className="type-caption text-muted-foreground">
            {t(`listings.grades.${grade}.text`)}
          </Text>
        </VStack>
      </VStack>

      {/* Packaging & Certifications */}
      <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
        <VStack className="gap-2">
          <Text className="type-body-bold text-foreground">
            {t("listings.step2.packagingType")}
          </Text>
          <VStack className="gap-1.5">
            {PACKAGING_IDS.map((id) => {
              const isSelected = packaging === id;

              return (
                <Pressable
                  key={id}
                  onPress={() => setPackaging(id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={[
                    "min-h-tap flex-row items-center justify-between rounded-field border px-3",
                    isSelected ? "border-primary bg-secondary" : "border-border bg-card"
                  ].join(" ")}
                >
                  <Text
                    className={`type-body ${
                      isSelected ? "type-body-bold text-primary" : "text-foreground"
                    }`}
                  >
                    {t(`listings.packaging.${id}`)}
                  </Text>
                  {isSelected && (
                    <Box className="h-5 w-5 items-center justify-center rounded-pill bg-primary">
                      <CheckIcon />
                    </Box>
                  )}
                </Pressable>
              );
            })}
          </VStack>
        </VStack>

        <VStack className="gap-2 border-t border-border pt-3">
          <Text className="type-caption-bold uppercase text-muted-foreground">
            {t("listings.step2.certificationsOptional")}
          </Text>
          <HStack className="flex-wrap gap-2">
            {CERTIFICATION_OPTIONS.map((cert) => {
              const isSelected = certifications.includes(cert);

              return (
                <Pressable
                  key={cert}
                  onPress={() => toggleCertification(cert)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={[
                    "min-h-tap flex-row items-center gap-1.5 rounded-chip border px-3",
                    isSelected ? "border-primary bg-secondary" : "border-border bg-card"
                  ].join(" ")}
                >
                  <Text
                    className={`type-body-sm-bold ${
                      isSelected ? "text-secondary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {t(`listings.certifications.${cert}`)}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </VStack>
      </VStack>
    </WizardShell>
  );
}
