import { useState } from "react";
import { Alert } from "react-native";
import {
  cropById,
  formatBenchmarkUpdatedText,
  getBenchmarkForCrop,
  type CropId
} from "@farm-pool/shared";

import { NumericKeypadModal } from "@/components/app/numeric-keypad-modal";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { toKg, type BatchUnit } from "@/features/listings/units";

import { WizardActions, WizardShell } from "./wizard-shell";

export type Step4PriceData = {
  pricePerKg: number;
  grossEarnings: number;
};

type Step4PriceProps = {
  cropId?: CropId;
  batchInfo?: {
    quantity: number;
    unit: BatchUnit;
    grade: string;
    variety: string;
  };
  initialData?: Partial<Step4PriceData>;
  onNext?: (data: Step4PriceData) => void;
  onBack?: () => void;
};

export default function Step4Price({
  cropId = "tomato",
  batchInfo = { quantity: 300, unit: "kg", grade: "A", variety: "Roma" },
  initialData,
  onNext,
  onBack
}: Step4PriceProps) {
  const crop = cropById(cropId) || cropById("tomato");
  const benchmark = getBenchmarkForCrop(cropId);

  const minBench = benchmark.lowPrice;
  const maxBench = benchmark.highPrice;
  const initialPrice = initialData?.pricePerKg ?? Math.round((minBench + maxBench) / 2);

  const [pricePerKg, setPricePerKg] = useState<number>(initialPrice);
  const [isKeypadVisible, setIsKeypadVisible] = useState<boolean>(false);

  const quantity = batchInfo.quantity > 0 ? batchInfo.quantity : 300;
  const totalQuantityKg = toKg(quantity, batchInfo.unit);
  const grossEarnings = pricePerKg * totalQuantityKg;

  const handleAdjustPrice = (delta: number) => {
    setPricePerKg((prev) => Math.max(1, prev + delta));
  };

  const getMarketFeedbackBadge = () => {
    if (pricePerKg < minBench) {
      return {
        label: "Fast Selling Price",
        icon: "⚡"
      };
    }
    if (pricePerKg >= minBench && pricePerKg <= maxBench) {
      return {
        label: "Highly Competitive",
        icon: "🔥"
      };
    }
    return {
      label: "Above Avg Premium",
      icon: "📈"
    };
  };

  const badge = getMarketFeedbackBadge();

  const handleContinue = () => {
    if (pricePerKg <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid asking price per kg.");
      return;
    }
    onNext?.({ pricePerKg, grossEarnings });
  };

  return (
    <WizardShell
      step={4}
      title="Set Asking Price"
      onBack={onBack}
      help={`Wholesale market benchmarks are sourced dynamically from regional hubs (e.g. ${benchmark.hubName}). Payouts are held safely in Fair Escrow.`}
      footer={
        <>
          <WizardActions
            onBack={onBack}
            continueLabel="Continue"
            onContinue={handleContinue}
            continueDisabled={pricePerKg <= 0}
          />
        </>
      }
      overlay={
        <>
          {" "}
          {/* Reusable Numeric Keypad Modal */}
          <NumericKeypadModal
            isOpen={isKeypadVisible}
            onClose={() => setIsKeypadVisible(false)}
            title="Enter Asking Price"
            initialValue={pricePerKg}
            unitLabel="Rs. / kg"
            presets={[minBench, Math.round((minBench + maxBench) / 2), maxBench, maxBench + 20]}
            onConfirm={(val) => setPricePerKg(Math.max(1, val))}
          />
        </>
      }
    >
      {/* Dynamic Crop & Batch Context Strip */}
      <HStack className="elevation-card items-center justify-between rounded-card border border-border bg-card p-3">
        <HStack className="flex-1 items-center gap-3">
          <CropTile emoji={crop.emoji} />
          <VStack className="flex-1 min-w-0">
            <Text className="type-body-bold text-foreground" numberOfLines={1}>
              Fresh {crop.name}
            </Text>
            <Text className="type-caption text-muted-foreground" numberOfLines={1}>
              Batch: {quantity} {batchInfo.unit} • Grade {batchInfo.grade} • {batchInfo.variety}
            </Text>
          </VStack>
        </HStack>

        <Box className="rounded-chip bg-secondary border border-border px-2 py-0.5">
          <Text className="type-body-sm-bold text-secondary-foreground">{crop.category}</Text>
        </Box>
      </HStack>

      {/* Today's Market Price Wholesale Benchmark Banner */}
      <VStack className="elevation-card gap-2 rounded-card border border-border bg-secondary p-4">
        <HStack className="items-center justify-between">
          <HStack className="items-center gap-1.5">
            <Text className="type-body-bold text-primary">ℹ Today's Wholesale Benchmark</Text>
          </HStack>

          <Box className="rounded-pill bg-card border border-border px-2.5 py-1">
            <Text className="type-caption-bold text-muted-foreground">📍 {benchmark.hubName}</Text>
          </Box>
        </HStack>

        <HStack className="items-baseline gap-1.5 pt-1">
          <Text className="type-h1 text-foreground">
            Rs. {minBench} - {maxBench}
          </Text>
          <Text className="type-caption text-muted-foreground">/ kg</Text>
        </HStack>

        <Text className="type-caption text-muted-foreground">
          {formatBenchmarkUpdatedText(benchmark.effectiveDate, benchmark.source)}
        </Text>
      </VStack>

      {/* Asking Price Input Card */}
      <VStack className="elevation-card gap-5 rounded-card border border-border bg-card p-6 items-center">
        <Text className="type-caption-bold uppercase text-muted-foreground">Your Asking Price</Text>

        {/* Stepper Controls & Large Display */}
        <HStack className="w-full items-center justify-between gap-3">
          <Pressable
            onPress={() => handleAdjustPrice(-5)}
            accessibilityRole="button"
            accessibilityLabel="Decrease price"
            className="h-13 w-13 items-center justify-center rounded-field border border-border bg-background active:opacity-80"
          >
            <Text className="type-h2 text-foreground">-</Text>
          </Pressable>

          {/* Center Number as <Text> wrapped in <Pressable> */}
          <Pressable
            onPress={() => setIsKeypadVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open keypad to edit asking price"
            className="flex-1 items-center px-2 py-1 active:opacity-80"
          >
            <HStack className="items-baseline justify-center gap-1">
              <Text className="type-body-bold text-primary">Rs.</Text>
              <Text className="type-display text-primary">{pricePerKg}</Text>
            </HStack>
            <Box className="my-1.5 h-0.5 w-16 bg-border" />
            <Text className="type-caption text-muted-foreground">per Kilogram</Text>
            <Text className="type-caption text-secondary-foreground pt-0.5">⌨ Tap to type</Text>
          </Pressable>

          <Pressable
            onPress={() => handleAdjustPrice(5)}
            accessibilityRole="button"
            accessibilityLabel="Increase price"
            className="h-13 w-13 items-center justify-center rounded-field border border-border bg-background active:opacity-80"
          >
            <Text className="type-h2 text-foreground">+</Text>
          </Pressable>
        </HStack>

        {/* Dynamic Feedback Badge */}
        <Box className="rounded-pill bg-secondary px-4 py-1.5">
          <Text className="type-body-sm-bold text-secondary-foreground">
            {badge.icon} {badge.label}
          </Text>
        </Box>
      </VStack>

      {/* Dark Gross Batch Value Card (Calculation + Final Earnings) */}
      <HStack className="elevation-card items-center justify-between rounded-card bg-brand-deep p-4 text-brand-deep-foreground">
        <HStack className="items-center gap-3">
          <Box className="h-11 w-11 items-center justify-center rounded-field bg-secondary border border-border">
            <Text className="type-h3">💰</Text>
          </Box>

          <VStack className="gap-0.5">
            <Text className="type-caption-bold uppercase text-brand-deep-muted">
              Total Est. Earnings
            </Text>
            <Text className="type-body-sm text-brand-deep-foreground">
              {totalQuantityKg} kg × Rs. {pricePerKg}
            </Text>
          </VStack>
        </HStack>

        <VStack className="items-end">
          <Text className="type-caption text-brand-deep-muted">LKR</Text>
          <Text className="type-h2 text-brand-deep-foreground">
            {grossEarnings.toLocaleString()}
          </Text>
        </VStack>
      </HStack>

      {/* Fair Escrow Protected Banner */}
      <HStack className="rounded-card border border-border bg-secondary p-4 items-start gap-3">
        <Box className="h-9 w-9 items-center justify-center rounded-pill bg-card border border-border text-secondary-foreground">
          <Text className="type-h4">🛡️</Text>
        </Box>
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground">Fair Escrow Protected</Text>
          <Text className="type-caption text-muted-foreground">
            Payout is securely held and guaranteed once the buyer weighbridge confirms your quantity
            at dropoff.
          </Text>
        </VStack>
      </HStack>
    </WizardShell>
  );
}
