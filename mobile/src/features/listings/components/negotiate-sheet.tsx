import React, { useState, useEffect } from "react";
import { View, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper
} from "@/components/ui/actionsheet";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import { type Offer } from "./offer-card";

export function NegotiateSheet({
  isOpen,
  onClose,
  offer,
  minKg,
  maxKg,
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  /** The listing's minimum order and what is left on it; a counter must fit between them. */
  minKg: number;
  maxKg: number;
  onSubmit: (rate: number, quantity: number, note: string) => void;
}) {
  const [rate, setRate] = useState(String(offer?.rate ?? ""));
  const [quantity, setQuantity] = useState(String(offer?.quantityKg ?? ""));
  const [note, setNote] = useState("");

  // Start from the terms on the table, so a counter is an edit of them and not a guess.
  useEffect(() => {
    if (isOpen && offer) {
      setRate(String(offer.rate));
      setQuantity(String(offer.quantityKg));
      setNote("");
    }
  }, [isOpen, offer?.id]);

  if (!offer) return null;

  const parsedRate = Number(rate) > 0 ? Math.round(Number(rate) * 100) / 100 : 0;
  const parsedQty = parseInt(quantity, 10) || 0;
  const total = Math.round(parsedRate * parsedQty * 100) / 100;
  const quantityFits = parsedQty >= minKg && parsedQty <= maxKg;
  const canSend = parsedRate > 0 && quantityFits;
  const isFarmer = offer.viewer === "FARMER";

  const adjustRate = (delta: number) => {
    setRate(String(Math.max(1, parsedRate + delta)));
  };

  const adjustQty = (delta: number) => {
    setQuantity(String(Math.min(maxKg, Math.max(minKg, parsedQty + delta))));
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} snapPoints={[90]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full bg-background rounded-t-3xl p-5 pb-8 max-h-[90vh]">
        <ActionsheetDragIndicatorWrapper className="mb-2">
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          className="w-full flex-1"
        >
          <ScrollView
            className="w-full flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <HStack className="items-start justify-between mb-4">
              <VStack>
                <Text className="text-[17px] font-bold text-primary">Submit Counter-Offer</Text>
                <Text className="mt-0.5 text-[12px] text-muted-foreground">
                  Negotiating with {offer.counterparty.name}
                </Text>
              </VStack>
              <Pressable
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-muted active:scale-95"
              >
                <Text className="text-[18px] text-muted-foreground leading-none mb-1">×</Text>
              </Pressable>
            </HStack>

            {/* Content Details (Rate, Quantity, Payout) */}
            <VStack className="gap-4 rounded-2xl bg-muted p-4 mb-4">
              {/* Rate */}
              <VStack>
                <HStack className="items-center justify-between">
                  <Text className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Counter Rate
                  </Text>
                </HStack>
                <HStack className="mt-2 items-center justify-between gap-3">
                  <Pressable
                    onPress={() => adjustRate(-1)}
                    className="h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm active:scale-95"
                  >
                    <Text className="text-[20px] font-bold text-primary">−</Text>
                  </Pressable>
                  <HStack className="items-baseline gap-1">
                    <Text className="text-[14px] font-bold text-muted-foreground">Rs.</Text>
                    <TextInput
                      value={rate}
                      onChangeText={setRate}
                      keyboardType="numeric"
                      className="w-24 text-center text-[26px] font-bold text-primary focus:outline-none"
                    />
                    <Text className="text-[14px] font-medium text-muted-foreground">/kg</Text>
                  </HStack>
                  <Pressable
                    onPress={() => adjustRate(1)}
                    className="h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm active:scale-95"
                  >
                    <Text className="text-[20px] font-bold text-primary">+</Text>
                  </Pressable>
                </HStack>
              </VStack>

              {/* Quantity */}
              <VStack className="border-t border-border pt-3">
                <HStack className="items-center justify-between">
                  <Text className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quantity
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    {minKg}–{maxKg} kg
                  </Text>
                </HStack>
                <HStack className="mt-2 items-center justify-between gap-3">
                  <Pressable
                    onPress={() => adjustQty(-10)}
                    className="h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm active:scale-95"
                  >
                    <Text className="text-[20px] font-bold text-primary">−</Text>
                  </Pressable>
                  <HStack className="items-baseline gap-1">
                    <TextInput
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="numeric"
                      className="w-24 text-center text-[26px] font-bold text-primary focus:outline-none"
                    />
                    <Text className="text-[14px] font-medium text-muted-foreground">kg</Text>
                  </HStack>
                  <Pressable
                    onPress={() => adjustQty(10)}
                    className="h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm active:scale-95"
                  >
                    <Text className="text-[20px] font-bold text-primary">+</Text>
                  </Pressable>
                </HStack>
                <HStack className="mt-2 items-center gap-1.5">
                  <Text className="text-[14px] text-foreground font-bold">i</Text>
                  <Text className="text-[11px] text-muted-foreground">
                    {quantityFits
                      ? `Between ${minKg} kg and ${maxKg} kg.`
                      : `Enter between ${minKg} kg and ${maxKg} kg.`}
                  </Text>
                </HStack>
              </VStack>

              {/* Total */}
              <HStack className="items-center justify-between rounded-xl border border-border bg-background p-3">
                <VStack>
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    {isFarmer ? "Gross payout" : "You pay"}
                  </Text>
                  <Text className="mt-0.5 text-[11.5px] font-semibold text-muted-foreground">
                    {parsedQty.toLocaleString("en-US")} kg × Rs.{" "}
                    {parsedRate.toLocaleString("en-US")}
                  </Text>
                </VStack>
                <VStack className="items-end">
                  <Text className="text-[11px] font-medium text-muted-foreground">Total</Text>
                  <Text className="mt-0.5 text-[16px] font-bold text-primary">
                    Rs. {total.toLocaleString("en-US")}
                  </Text>
                </VStack>
              </HStack>
            </VStack>

            {/* Notes & Actions */}
            <VStack className="mb-4">
              <Text className="text-[12px] font-semibold text-primary">Add a note</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={
                  isFarmer
                    ? "e.g. Sorted Grade A, ready for pickup tomorrow."
                    : "e.g. I can collect on Friday if the price works."
                }
                multiline
                numberOfLines={3}
                className="mt-1.5 w-full rounded-xl bg-muted p-3 text-[13px] text-foreground focus:outline-none min-h-[80px]"
                textAlignVertical="top"
                placeholderTextColor="#64748b"
              />
            </VStack>

            <HStack className="gap-2 pt-1 mb-8">
              <Pressable
                onPress={onClose}
                className="flex-1 rounded-xl bg-muted px-3 py-3 items-center justify-center active:scale-95"
              >
                <Text className="text-[13px] font-semibold text-muted-foreground">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onSubmit(parsedRate, parsedQty, note)}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSend }}
                className={`flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-brand-deep px-3 py-3 shadow-sm active:scale-95 ${canSend ? "" : "opacity-60"}`}
              >
                <Text className="text-[13px] font-semibold text-brand-deep-foreground">
                  Send Counter
                </Text>
              </Pressable>
            </HStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
