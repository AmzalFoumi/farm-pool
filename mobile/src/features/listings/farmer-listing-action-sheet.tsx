import { type Listing, cropById } from "@farm-pool/shared";
import { View } from "react-native";
import { formatPrice } from "@/lib/format";

import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
  ActionsheetScrollView
} from "@/components/ui/actionsheet";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "./crop-tile";

import {
  EditIcon,
  EyeOffIcon,
  CheckCircleIcon,
  TrashIcon,
  ChevronRightIcon,
  PlayIcon,
  CheckIcon,
  PlusIcon
} from "@/components/app/icons";

interface FarmerListingActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onEdit?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onMarkAsSold?: () => void;
  onDelete?: () => void;
}

export function FarmerListingActionSheet({
  isOpen,
  onClose,
  listing,
  onEdit,
  onPause,
  onResume,
  onShare,
  onDuplicate,
  onMarkAsSold,
  onDelete
}: FarmerListingActionSheetProps) {
  if (!listing) return null;

  const crop = cropById(listing.cropId);
  const estimatedTotal = listing.pricePerKg * listing.quantityKg;
  const isPaused = listing.status === "paused";

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="p-0 bg-background rounded-t-3xl border-t border-border max-h-[88vh]">
        <ActionsheetDragIndicatorWrapper className="pt-3 pb-1">
          <ActionsheetDragIndicator className="w-10 h-1 bg-muted-foreground/30" />
        </ActionsheetDragIndicatorWrapper>

        {/* Sheet Header */}
        <HStack className="px-4 py-3 border-b border-border items-center justify-between w-full">
          <HStack className="items-center gap-3 flex-1 min-w-0 pr-2">
            <View className="relative w-12 h-12 rounded-xl overflow-hidden bg-secondary items-center justify-center shrink-0 border border-border">
              <CropTile emoji={crop.emoji} />
              {listing.grade && (
                <View className="absolute bottom-0.5 right-0.5 bg-brand-deep w-3.5 h-3.5 rounded-full items-center justify-center shadow">
                  <Text className="text-[9px] font-black text-brand-deep-foreground">
                    {listing.grade}
                  </Text>
                </View>
              )}
            </View>
            <VStack className="flex-1 min-w-0">
              <HStack className="items-center gap-2">
                <Text className="type-body-sm-bold text-foreground truncate">{crop.name}</Text>
                <View className="px-1.5 py-0.5 bg-success-subtle rounded-md">
                  <Text className="text-[10px] font-bold text-success whitespace-nowrap">
                    {formatPrice(listing.pricePerKg)}/kg
                  </Text>
                </View>
              </HStack>
              <Text className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                {listing.quantityKg} kg batch • {listing.grade ? `Grade ${listing.grade} • ` : ""}
                Est. {formatPrice(estimatedTotal)}
              </Text>
            </VStack>
          </HStack>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 items-center justify-center shrink-0 active:opacity-70"
          >
            <View className="text-muted-foreground rotate-45">
              <PlusIcon />
            </View>
          </Pressable>
        </HStack>

        {isPaused && (
          <View className="px-3 pt-3">
            <View className="bg-warning-subtle border border-warning/20 rounded-xl p-3 items-start gap-2 flex-row">
              <View className="text-warning mt-0.5">
                <EyeOffIcon />
              </View>
              <VStack className="flex-1">
                <Text className="text-xs font-bold text-warning-foreground">
                  Listing is currently inactive.
                </Text>
                <Text className="text-[11px] text-warning-foreground/80 leading-tight">
                  Buyers and wholesale aggregators cannot discover or place bids on this batch.
                </Text>
              </VStack>
            </View>
          </View>
        )}

        <ActionsheetScrollView
          className="w-full px-3 py-2"
          contentContainerClassName="gap-1.5 pb-safe"
        >
          {isPaused && (
            <Pressable
              onPress={() => {
                onResume?.();
                onClose();
              }}
              className="w-full flex-row items-center gap-3 p-2.5 rounded-xl bg-success-subtle hover:bg-success-subtle/80 active:opacity-70 transition-colors"
            >
              <View className="w-9 h-9 rounded-xl bg-brand-deep items-center justify-center shrink-0 text-brand-deep-foreground">
                <PlayIcon />
              </View>
              <VStack className="flex-1 min-w-0">
                <HStack className="items-center gap-2">
                  <Text className="text-xs font-bold text-foreground">
                    Resume / Reactivate Listing
                  </Text>
                  <View className="px-1.5 py-0.5 bg-brand-deep rounded">
                    <Text className="text-[9px] font-bold text-brand-deep-foreground">Primary</Text>
                  </View>
                </HStack>
                <Text className="text-[11px] text-muted-foreground font-medium truncate">
                  Make visible to buyers again to start receiving bids
                </Text>
              </VStack>
              <View className="text-muted-foreground shrink-0">
                <ChevronRightIcon />
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              onEdit?.();
              onClose();
            }}
            className="w-full flex-row items-center gap-3 p-2.5 rounded-xl active:bg-secondary transition-colors"
          >
            <View className="w-9 h-9 rounded-xl bg-secondary items-center justify-center shrink-0 text-primary">
              <EditIcon />
            </View>
            <VStack className="flex-1 min-w-0">
              <Text className="text-xs font-bold text-foreground">Edit Listing Details</Text>
              <Text className="text-[11px] text-muted-foreground font-medium truncate">
                Adjust price, batch quantity, grade & harvest date
              </Text>
            </VStack>
            <View className="text-muted-foreground shrink-0">
              <ChevronRightIcon />
            </View>
          </Pressable>

          {!isPaused && (
            <Pressable
              onPress={() => {
                onPause?.();
                onClose();
              }}
              className="w-full flex-row items-center gap-3 p-2.5 rounded-xl active:bg-secondary transition-colors"
            >
              <View className="w-9 h-9 rounded-xl bg-warning-subtle items-center justify-center shrink-0 text-warning">
                <EyeOffIcon />
              </View>
              <VStack className="flex-1 min-w-0">
                <Text className="text-xs font-bold text-foreground">
                  Pause / Hide from Marketplace
                </Text>
                <Text className="text-[11px] text-muted-foreground font-medium truncate">
                  Temporarily hide from buyers without deleting batch data
                </Text>
              </VStack>
              <View className="text-muted-foreground shrink-0">
                <ChevronRightIcon />
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              onMarkAsSold?.();
              onClose();
            }}
            className="w-full flex-row items-center gap-3 p-2.5 rounded-xl active:bg-secondary transition-colors"
          >
            <View className="w-9 h-9 rounded-xl bg-success-subtle items-center justify-center shrink-0 text-success">
              <CheckCircleIcon />
            </View>
            <VStack className="flex-1 min-w-0">
              <Text className="text-xs font-bold text-foreground">Mark as Sold</Text>
              <Text className="text-[11px] text-muted-foreground font-medium truncate">
                {isPaused
                  ? "Record offline / direct settlement receipt"
                  : "Conclude crop escrow & record settlement receipt"}
              </Text>
            </VStack>
            <View className="text-muted-foreground shrink-0">
              <ChevronRightIcon />
            </View>
          </Pressable>

          <View className="h-px bg-border my-1" />

          <Pressable
            onPress={() => {
              onDelete?.();
              onClose();
            }}
            className="w-full flex-row items-center gap-3 p-2.5 rounded-xl bg-destructive/10 active:opacity-70 transition-colors"
          >
            <View className="w-9 h-9 rounded-xl bg-destructive-subtle items-center justify-center shrink-0 text-destructive">
              <TrashIcon />
            </View>
            <VStack className="flex-1 min-w-0">
              <Text className="text-xs font-bold text-destructive">Delete Listing</Text>
              <Text className="text-[11px] text-destructive/80 font-medium truncate">
                Permanently remove this batch from FarmPool LK
              </Text>
            </VStack>
            <View className="text-destructive/60 shrink-0">
              <ChevronRightIcon />
            </View>
          </Pressable>
        </ActionsheetScrollView>
        <View className="p-3 bg-card border-t border-border w-full flex items-center justify-center pb-safe">
          <Pressable
            onPress={onClose}
            className="w-full py-3 rounded-xl bg-background border border-border items-center justify-center active:bg-secondary transition-colors shadow-sm"
          >
            <Text className="text-xs font-bold text-foreground">Cancel</Text>
          </Pressable>
        </View>
      </ActionsheetContent>
    </Actionsheet>
  );
}
