import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cropById, type CropId } from "@farm-pool/shared";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { BackIcon, CheckIcon } from "@/components/app/icons";
import { NumericKeypadModal } from "@/components/app/numeric-keypad-modal";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { HelpCircleIcon, Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
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
import { toKg, type BatchUnit } from "@/features/listings/units";

export type Step2QuantityData = {
  quantity: number;
  unit: BatchUnit;
  moqKg: number;
  variety: string;
  grade: "A" | "B" | "C";
  packaging: string;
  certifications: string[];
};

type Step2QuantityProps = {
  cropId?: CropId;
  initialData?: Partial<Step2QuantityData>;
  onNext?: (data: Step2QuantityData) => void;
  onBack?: () => void;
  onChangeCrop?: () => void;
};

const GRADE_DESCRIPTIONS = {
  A: {
    title: "Market Grade A (Fresh Premium)",
    text: "Flawless appearance, uniform size, firm texture, zero blemishes. Best suited for supermarket retail."
  },
  B: {
    title: "Grade B (Commercial / Processing)",
    text: "Slight cosmetic blemishes or skin color variations. Firm texture. Ideal for restaurant prep & bulk kitchens."
  },
  C: {
    title: "Grade C (Ripe / Processing Grade)",
    text: "Softer texture or irregular shapes. Best suited for paste, juices, purées, and sauces."
  }
} as const;

const PACKAGING_OPTIONS = [
  { id: "plastic-crate", label: "Reusable Plastic Crates (Standard 25kg)" },
  { id: "wooden-box", label: "Ventilated Wooden Boxes" },
  { id: "cardboard", label: "Heavy-Duty Corrugated Cartons" },
  { id: "mesh-bag", label: "Net / Mesh Sacks" }
];

const CERTIFICATION_OPTIONS = ["Organic Certified", "GAP Certified", "Pesticide-Free"];

export default function Step2Quantity({
  cropId = "tomato",
  initialData,
  onNext,
  onBack,
  onChangeCrop
}: Step2QuantityProps) {
  const insets = useSafeAreaInsets();
  const crop = cropById(cropId) || cropById("tomato");
  const defaultVariety = crop.varieties?.[0] || "Standard / Local";

  // Initial quantity defaults to 0 as requested so farmer types their supply
  const [quantity, setQuantity] = useState<number>(initialData?.quantity ?? 0);
  const [quantityText, setQuantityText] = useState<string>(
    initialData?.quantity ? String(initialData.quantity) : "0"
  );
  const [unit, setUnit] = useState<"kg" | "crates" | "sacks">(initialData?.unit ?? "kg");

  // MOQ state
  const [moqKg, setMoqKg] = useState<number>(initialData?.moqKg ?? 20);
  const [isCustomMoq, setIsCustomMoq] = useState<boolean>(false);
  const [customMoqText, setCustomMoqText] = useState<string>("20");

  // Keypad modal state
  const [isKeypadVisible, setIsKeypadVisible] = useState<boolean>(false);
  const [keypadInput, setKeypadInput] = useState<string>("");

  const [variety, setVariety] = useState<string>(initialData?.variety ?? defaultVariety);
  const [grade, setGrade] = useState<"A" | "B" | "C">(initialData?.grade ?? "A");
  const [packaging, setPackaging] = useState<string>(
    initialData?.packaging ?? PACKAGING_OPTIONS[0].id
  );
  const [certifications, setCertifications] = useState<string[]>(
    initialData?.certifications ?? ["Organic Certified"]
  );

  // Conversion calculations
  const totalKg = toKg(quantity, unit);
  const isBelowMoq = totalKg < moqKg || quantity <= 0;

  const handleQuantityTextChange = (text: string) => {
    setQuantityText(text);
    const parsed = parseInt(text.replace(/[^0-9]/g, ""), 10);
    setQuantity(isNaN(parsed) ? 0 : parsed);
  };

  const handleAdjustQuantity = (delta: number) => {
    const step = unit === "kg" ? delta : delta > 0 ? 1 : -1;
    const newQty = Math.max(0, quantity + step);
    setQuantity(newQty);
    setQuantityText(String(newQty));
  };

  const handleSelectUnit = (newUnit: "kg" | "crates" | "sacks") => {
    setUnit(newUnit);
  };

  const handleSelectMoq = (val: number) => {
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
    setKeypadInput(String(quantity));
    setIsKeypadVisible(true);
  };

  const confirmKeypad = () => {
    const parsed = parseInt(keypadInput.replace(/[^0-9]/g, ""), 10);
    const finalVal = isNaN(parsed) ? 0 : parsed;
    setQuantity(finalVal);
    setQuantityText(String(finalVal));
    setIsKeypadVisible(false);
  };

  const toggleCertification = (cert: string) => {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleShowHelp = () => {
    Alert.alert(
      "Batch & Quantity Help",
      "Specify your total supply quantity (type directly or use stepper), minimum order quantity (MOQ), crop variety, quality grade, and packaging parameters."
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
              className="h-tap w-tap items-center justify-center rounded-field border border-border bg-card"
            >
              <BackIcon />
            </Pressable>

            <VStack className="items-center">
              <Text className="type-body-sm-bold uppercase text-secondary-foreground">
                Step 2 of 5
              </Text>
              <Text className="type-title text-foreground">Batch & Quantity Details</Text>
            </VStack>

            <Pressable
              onPress={handleShowHelp}
              accessibilityRole="button"
              accessibilityLabel="Help"
              className="h-tap w-tap items-center justify-center rounded-field bg-secondary"
            >
              <Icon as={HelpCircleIcon} className="text-brand-deep" />
            </Pressable>
          </HStack>

          {/* Progress bar track (40% for Step 2) */}
          <Box className="h-1.5 w-full overflow-hidden rounded-pill bg-muted">
            <Box className="h-full w-2/5 rounded-pill bg-brand-deep" />
          </Box>
        </VStack>

        {/* Selected Crop Summary Card */}
        <HStack className="elevation-card items-center justify-between rounded-card border border-border bg-card p-3">
          <HStack className="flex-1 items-center gap-3">
            <CropTile emoji={crop.emoji} />
            <VStack className="flex-1 min-w-0">
              <HStack className="items-center gap-2 flex-wrap">
                <Text className="type-body-bold text-foreground" numberOfLines={1}>
                  Fresh {crop.name}
                </Text>
                <Box className="rounded-chip bg-warning-subtle px-2 py-0.5">
                  <Text className="type-body-sm-bold text-warning">{crop.category}</Text>
                </Box>
              </HStack>
              <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                Specify quantity & batch parameters
              </Text>
            </VStack>
          </HStack>

          <Pressable
            onPress={onChangeCrop || onBack}
            accessibilityRole="button"
            className="min-h-tap px-2 justify-center"
          >
            <Text className="type-body-bold text-info">Change</Text>
          </Pressable>
        </HStack>

        {/* Total Supply Quantity Section */}
        <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
          <HStack className="items-center justify-between">
            <Text className="type-h4 text-foreground">Total Supply Quantity</Text>
            <Pressable
              onPress={openKeypad}
              accessibilityRole="button"
              className="min-h-tap flex-row items-center gap-1 rounded-chip border border-info/30 bg-info-subtle px-3 py-1"
            >
              <Text className="type-body-sm-bold text-info">⌨ Keypad</Text>
            </Pressable>
          </HStack>

          {/* Stepper Display — Big Green Box with - and + Buttons */}
          <HStack className="items-center justify-between rounded-card border border-primary bg-secondary/40 p-3">
            <Pressable
              onPress={() => handleAdjustQuantity(-10)}
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              className="h-12 w-12 items-center justify-center rounded-field border border-primary bg-card active:opacity-80 shadow-sm"
            >
              <Text className="type-h2 text-primary">-</Text>
            </Pressable>

            {/* Center Number as <Text> wrapped in <Pressable> (toggles keypad modal) */}
            <Pressable
              onPress={openKeypad}
              accessibilityRole="button"
              accessibilityLabel="Open keypad to edit quantity"
              className="flex-1 items-center px-2 py-1 active:opacity-80"
            >
              <HStack className="items-baseline justify-center gap-1.5">
                <Text className="type-display text-secondary-foreground">{quantity}</Text>
                <Text className="type-h3 text-secondary-foreground/80">{unit}</Text>
              </HStack>
              <Text className="type-caption text-secondary-foreground/80 text-center">
                ⌨ Tap to open keypad
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleAdjustQuantity(10)}
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              className="h-12 w-12 items-center justify-center rounded-field border border-primary bg-card active:opacity-80 shadow-sm"
            >
              <Text className="type-h2 text-primary">+</Text>
            </Pressable>
          </HStack>

          {/* Unit Switcher */}
          <VStack className="gap-2 border-t border-border pt-3">
            <Text className="type-caption text-muted-foreground">Measurement Unit Format:</Text>
            <HStack className="flex-row flex-wrap gap-2">
              {(["kg", "crates", "sacks"] as const).map((u) => {
                const isSelected = unit === u;
                const label = u === "kg" ? "Kilograms" : u === "crates" ? "Crates" : "Sacks";
                const sub =
                  u === "kg" ? "(kg)" : u === "crates" ? "~25 kg / crate" : "~50 kg / sack";

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
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
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
            <HStack className="items-center justify-between rounded-card border border-info/30 bg-info-subtle p-3">
              <Text className="type-caption text-foreground">Total Calculated Weight:</Text>
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
              <Text className="type-h4 text-foreground">Minimum Order Quantity (MOQ)</Text>
              <Text className="type-caption text-muted-foreground">
                Smallest volume buyers can order
              </Text>
            </VStack>

            <Box className="rounded-pill bg-warning-subtle px-3 py-1 border border-warning/20">
              <Text className="type-body-sm-bold text-warning">
                Min: {moqKg} {unit}
              </Text>
            </Box>
          </HStack>

          {/* Presets Grid */}
          <VStack className="gap-2">
            <Text className="type-caption-bold uppercase text-muted-foreground">
              Quick Volume Presets
            </Text>
            <HStack className="flex-row flex-wrap gap-2">
              {[20, 50, 100].map((preset) => {
                const isSelected = !isCustomMoq && moqKg === preset;

                return (
                  <Pressable
                    key={preset}
                    onPress={() => handleSelectMoq(preset)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={[
                      "min-h-tap flex-1 min-w-[20%] items-center justify-center rounded-chip border p-2",
                      isSelected ? "border-primary bg-secondary/30" : "border-border bg-card"
                    ].join(" ")}
                  >
                    <Text
                      className={`type-body-sm-bold ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {preset} kg
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
                  Custom ✏
                </Text>
              </Pressable>
            </HStack>

            {/* Custom MOQ Input Field when Custom preset selected */}
            {isCustomMoq && (
              <AppTextField
                label="Custom Minimum Order Quantity (kg)"
                value={customMoqText}
                onChangeText={handleCustomMoqChange}
                keyboardType="numeric"
                placeholder="e.g. 15"
              />
            )}
          </VStack>

          {/* MOQ / Quantity Warnings */}
          {quantity <= 0 ? (
            <VStack className="rounded-card border border-warning/30 bg-warning-subtle p-3 gap-1">
              <Text className="type-body-bold text-warning">Enter Supply Quantity</Text>
              <Text className="type-caption text-foreground">
                Please enter a supply quantity greater than 0.
              </Text>
            </VStack>
          ) : isBelowMoq ? (
            <VStack className="rounded-card border border-destructive/30 bg-destructive-subtle p-3 gap-1">
              <Text className="type-body-bold text-destructive">Supply Below Minimum Order</Text>
              <Text className="type-caption text-destructive">
                Total supply ({totalKg} kg) is less than Minimum Order limit ({moqKg} kg).
              </Text>
            </VStack>
          ) : null}
        </VStack>

        {/* Variety Section (Dynamic based on selected Crop!) */}
        <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
          <Text className="type-h4 text-foreground">{crop.name} Variety</Text>

          <View className="flex-row flex-wrap gap-2">
            {(crop.varieties || ["Standard / Local"]).map((v) => {
              const isSelected = variety === v;

              return (
                <Pressable
                  key={v}
                  onPress={() => setVariety(v)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={[
                    "min-h-tap flex-1 min-w-[45%] flex-row items-center justify-between rounded-field border px-3 py-2",
                    isSelected ? "border-primary bg-secondary/30" : "border-border bg-card"
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
              <Text className="type-h4 text-foreground">Quality Grade</Text>
              <Text className="type-caption text-muted-foreground">
                Classify based on firmness & appearance
              </Text>
            </VStack>

            <Box className="rounded-field bg-brand-deep px-3 py-1">
              <Text className="type-body-sm-bold text-brand-deep-foreground">Grade {grade}</Text>
            </Box>
          </HStack>

          <HStack className="rounded-card border border-border bg-background p-1 gap-1">
            {(["A", "B", "C"] as const).map((g) => {
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
                    Grade {g}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>

          <VStack className="rounded-card border border-info/30 bg-info-subtle p-3 gap-1">
            <Text className="type-body-bold text-primary">{GRADE_DESCRIPTIONS[grade].title}</Text>
            <Text className="type-caption text-muted-foreground">
              {GRADE_DESCRIPTIONS[grade].text}
            </Text>
          </VStack>
        </VStack>

        {/* Packaging & Certifications */}
        <VStack className="elevation-card gap-4 rounded-card border border-border bg-card p-4">
          <VStack className="gap-2">
            <Text className="type-body-bold text-foreground">Packaging Type</Text>
            <VStack className="gap-1.5">
              {PACKAGING_OPTIONS.map((opt) => {
                const isSelected = packaging === opt.id;

                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setPackaging(opt.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={[
                      "min-h-tap flex-row items-center justify-between rounded-field border px-3",
                      isSelected ? "border-primary bg-secondary/30" : "border-border bg-card"
                    ].join(" ")}
                  >
                    <Text
                      className={`type-body ${
                        isSelected ? "type-body-bold text-primary" : "text-foreground"
                      }`}
                    >
                      {opt.label}
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
              Certifications (Optional)
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
                      isSelected ? "border-warning bg-warning-subtle" : "border-border bg-card"
                    ].join(" ")}
                  >
                    <Text
                      className={`type-body-sm-bold ${
                        isSelected ? "text-warning" : "text-muted-foreground"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {cert}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Reusable Keypad Entry Modal */}
      <NumericKeypadModal
        isOpen={isKeypadVisible}
        onClose={() => setIsKeypadVisible(false)}
        title="Enter Total Quantity"
        initialValue={quantity}
        unitLabel={unit}
        presets={[50, 100, 250, 500]}
        onConfirm={(val) => {
          setQuantity(val);
          setQuantityText(String(val));
        }}
      />

      {/* Sticky Bottom Navigation Bar */}
      <View
        className="border-t border-border bg-card p-gutter gap-2"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <HStack className="items-center justify-between px-1">
          <Text className="type-caption text-muted-foreground">Batch Summary:</Text>
          <Text className="type-body-bold text-foreground">
            {quantity} {unit} • Grade {grade} ({variety})
          </Text>
        </HStack>

        <HStack className="gap-2">
          <View className="w-1/3">
            <AppButton label="Back" variant="outline" onPress={onBack} />
          </View>
          <View className="flex-1">
            <AppButton label="Continue" disabled={isBelowMoq} onPress={handleContinue} />
          </View>
        </HStack>
      </View>
    </View>
  );
}
