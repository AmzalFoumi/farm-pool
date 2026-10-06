import React from "react";
import { View, ScrollView } from "react-native";
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
import { type Offer as SharedOffer } from "@farm-pool/shared";

export function NegotiationHistorySheet({
  isOpen,
  onClose,
  offer
}: {
  isOpen: boolean;
  onClose: () => void;
  offer: SharedOffer | null;
}) {
  if (!offer) return null;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} snapPoints={[90]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full bg-background rounded-t-3xl p-5 pb-8 max-h-[90vh]">
        <ActionsheetDragIndicatorWrapper className="mb-2">
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <HStack className="items-start justify-between w-full mb-6">
          <VStack>
            <Text className="text-[17px] font-bold text-primary">Negotiation History</Text>
            <Text className="mt-0.5 text-[12px] text-muted-foreground">Timeline of offers</Text>
          </VStack>
          <Pressable
            onPress={onClose}
            className="h-8 w-8 items-center justify-center rounded-full bg-muted active:scale-95"
          >
            <Text className="text-[18px] text-muted-foreground leading-none mb-1">×</Text>
          </Pressable>
        </HStack>

        <ScrollView className="w-full" showsVerticalScrollIndicator={false}>
          <VStack className="gap-4 w-full">
            {offer.negotiationHistory.map((entry, index) => {
              const isFarmer = entry.senderType === "FARMER";
              return (
                <View
                  key={index}
                  className={`p-4 rounded-2xl w-11/12 ${isFarmer ? "bg-brand-deep/10 self-end rounded-tr-sm" : "bg-muted self-start rounded-tl-sm"}`}
                >
                  <HStack className="justify-between items-center mb-2">
                    <Text
                      className={`text-[12px] font-bold ${isFarmer ? "text-brand-deep" : "text-foreground"}`}
                    >
                      {isFarmer ? "You" : "Buyer"}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()}{" "}
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </Text>
                  </HStack>

                  <HStack className="justify-between items-end mb-2">
                    <VStack>
                      <Text className="text-[11px] text-muted-foreground">Price</Text>
                      <Text className="text-[16px] font-bold text-foreground">
                        Rs. {entry.proposedPrice}/kg
                      </Text>
                    </VStack>
                    <VStack className="items-end">
                      <Text className="text-[11px] text-muted-foreground">Quantity</Text>
                      <Text className="text-[14px] font-bold text-foreground">
                        {entry.proposedQuantityKg} kg
                      </Text>
                    </VStack>
                  </HStack>

                  {entry.note && (
                    <View className="mt-1 pt-2 border-t border-border/50">
                      <Text className="text-[12px] italic text-muted-foreground">
                        "{entry.note}"
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
