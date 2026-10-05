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
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer;
  onSubmit: (rate: number, quantity: number, note: string) => void;
}) {
  const [rate, setRate] = useState(String(offer?.rate + 2 || 176));
  const [quantity, setQuantity] = useState(String(offer?.quantityKg || 500));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen && offer) {
      setRate(String(offer.rate + 2));
      setQuantity(String(offer.quantityKg));
      setNote("");
    }
  }, [isOpen, offer]);

  if (!offer) return null;

  const parsedRate = parseInt(rate, 10) || 0;
  const parsedQty = parseInt(quantity, 10) || 0;
  const total = parsedRate * parsedQty;

  const adjustRate = (delta: number) => {
    const next = Math.max(0, parsedRate + delta);
    setRate(String(next));
  };

  const adjustQty = (delta: number) => {
    const next = Math.min(offer.quantityKg, Math.max(50, parsedQty + delta));
    setQuantity(String(next));
  };

  const setFixedQty = (qty: number) => {
    setQuantity(String(Math.min(offer.quantityKg, Math.max(50, qty))));
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} snapPoints={[90]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full bg-background rounded-t-3xl p-5 pb-8 max-h-[90vh]">
        <ActionsheetDragIndicatorWrapper className="mb-2">
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="w-full"
        >
          <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
            {/* Header */}
            <HStack className="items-start justify-between mb-4">
              <VStack>
                <Text className="text-[17px] font-bold text-primary">Submit Counter-Offer</Text>
                <Text className="mt-0.5 text-[12px] text-muted-foreground">
                  Negotiating with {offer.buyer.name}
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
                  <Text className="text-[12px] font-bold text-foreground">
                    Target: Rs. {offer.rate + 5}
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
                    Max: {offer.quantityKg} kg
                  </Text>
                </HStack>
                <HStack className="mt-2 items-center justify-between gap-3">
                  <Pressable
                    onPress={() => adjustQty(-50)}
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
                    onPress={() => adjustQty(50)}
                    className="h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm active:scale-95"
                  >
                    <Text className="text-[20px] font-bold text-primary">+</Text>
                  </Pressable>
                </HStack>
                <HStack className="mt-2 items-center gap-1.5">
                  <Text className="text-[14px] text-foreground font-bold">i</Text>
                  <Text className="text-[11px] text-muted-foreground">
                    Partial quantity is supported. Remaining crop stays listed.
                  </Text>
                </HStack>
              </VStack>

              {/* Total */}
              <HStack className="items-center justify-between rounded-xl border border-border bg-background p-3">
                <VStack>
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Gross payout
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
                placeholder="e.g. Sorted Grade A, well sun-dried, ready for pickup tomorrow."
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
                className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-xl bg-brand-deep px-3 py-3 shadow-sm active:scale-95"
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
