import { cropById, type Listing } from "@farm-pool/shared";
import { View } from "react-native";

import {
  CheckMarkIcon,
  ChevronRightIcon,
  DotsIcon,
  OffersIcon,
  PoolIcon,
  SoloIcon
} from "@/components/app/icons";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { formatPrice } from "@/lib/format";
import { CropTile } from "./crop-tile";

interface FarmerListingCardProps {
  listing: Listing;
  onPress?: () => void;
  onOptionsPress?: () => void;
  onResumePress?: () => void;
  onEditPress?: () => void;
  onCompletePress?: () => void;
  offersCount?: number;
}

export function FarmerListingCard({
  listing,
  onPress,
  onOptionsPress,
  onResumePress,
  onEditPress,
  onCompletePress,
  offersCount = 0
}: FarmerListingCardProps) {
  const crop = cropById(listing.cropId);
  const estimatedTotal = listing.pricePerKg * listing.quantityKg;

  const renderActiveActions = () => {
    // Dynamic styles based on offers
    let offerTagBg = "bg-secondary";
    let offerTagText = "text-secondary-foreground";
    let offersLabel = "No offers yet";

    if (offersCount > 0) {
      offerTagBg = "bg-success-subtle";
      offerTagText = "text-success";
      offersLabel = [offersCount, "offer" + (offersCount === 1 ? "" : "s"), "received"].join(" ");
    }

    return (
      <HStack className="gap-2 pt-0.5">
        <Pressable
          className={[
            "flex-1 rounded-xl px-2.5 py-1.5 flex-row items-center justify-between",
            offerTagBg
          ].join(" ")}
        >
          <HStack className="items-center gap-1.5">
            <View className={offerTagText}>
              <OffersIcon />
            </View>
            <Text className={["type-body-sm-bold", offerTagText].join(" ")}>{offersLabel}</Text>
          </HStack>
          <View className={offerTagText}>
            <ChevronRightIcon />
          </View>
        </Pressable>
        {listing.fulfillmentOption && (
          <View className="bg-info-subtle rounded-xl px-2.5 py-1.5 flex-row items-center gap-1.5">
            <View className="text-info">
              {listing.fulfillmentOption === "shared" ? <PoolIcon /> : <SoloIcon />}
            </View>
            <Text className="type-body-sm-bold text-info capitalize">
              {listing.fulfillmentOption === "shared" ? "Shared Pool" : "Solo Delivery"}
            </Text>
          </View>
        )}
      </HStack>
    );
  };

  const renderPausedActions = () => (
    <HStack className="gap-2 pt-1">
      <Pressable
        onPress={onResumePress}
        className="flex-[3] bg-primary rounded-xl py-2.5 px-3 flex-row items-center justify-center gap-1.5 active:opacity-80"
      >
        <Text className="type-body-sm-bold text-primary-foreground">Resume / Unhide</Text>
      </Pressable>
      <Pressable
        onPress={onEditPress}
        className="flex-1 bg-secondary rounded-xl py-2.5 px-3 flex-row items-center justify-center gap-1 active:opacity-80"
      >
        <Text className="type-body-sm-bold text-secondary-foreground">Edit</Text>
      </Pressable>
    </HStack>
  );

  const renderDraftActions = () => (
    <HStack className="gap-2 pt-0.5">
      <Pressable
        onPress={onCompletePress}
        className="flex-1 bg-brand-deep rounded-xl px-3 py-2 flex-row items-center justify-center gap-1.5 active:opacity-80"
      >
        <Text className="type-body-sm-bold text-brand-deep-foreground">Complete Listing</Text>
        <View className="text-brand-deep-foreground">
          <ChevronRightIcon />
        </View>
      </Pressable>
    </HStack>
  );

  const renderSoldActions = () => (
    <HStack className="items-center justify-between pt-1 border-t border-border mt-1">
      <Text className="type-body-sm text-muted-foreground">Completed recently</Text>
      <HStack className="items-center gap-1">
        <View className="text-success">
          <CheckMarkIcon />
        </View>
        <Text className="type-body-sm-bold text-success">Escrow Released</Text>
      </HStack>
    </HStack>
  );

  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-card p-3.5 shadow-sm border border-border flex-col gap-3"
    >
      {listing.status === "paused" && (
        <View className="bg-muted rounded-xl px-3 py-1.5 flex-row items-center justify-between mb-1">
          <Text className="type-body-sm-bold text-muted-foreground uppercase tracking-wider text-[10px]">
            Hidden from marketplace
          </Text>
        </View>
      )}

      <HStack className="items-start gap-3">
        <View className="relative shrink-0">
          <View
            className={[
              "w-16 h-16 rounded-xl overflow-hidden bg-secondary items-center justify-center",
              listing.status === "sold" ? "opacity-50" : ""
            ].join(" ")}
          >
            <CropTile emoji={crop.emoji} />
          </View>
          {listing.grade && listing.status !== "sold" && (
            <View className="absolute bottom-1 right-1 bg-brand-deep w-4 h-4 rounded-full items-center justify-center shadow">
              <Text className="text-[10px] font-black text-brand-deep-foreground">
                {listing.grade}
              </Text>
            </View>
          )}
          {listing.status === "draft" && (
            <View className="absolute bottom-1 right-1 bg-warning px-1 rounded shadow">
              <Text className="text-[9px] font-black text-warning-foreground">DRAFT</Text>
            </View>
          )}
          {listing.status === "sold" && (
            <View className="absolute bottom-1 right-1 bg-muted-foreground px-1 rounded shadow">
              <Text className="text-[9px] font-black text-card">SOLD</Text>
            </View>
          )}
        </View>

        <VStack className="flex-1">
          <HStack className="items-center gap-2 flex-wrap">
            <Text className="type-body-bold text-foreground leading-tight" numberOfLines={1}>
              {crop.name}
            </Text>
            {listing.status === "paused" && (
              <View className="bg-muted px-1.5 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-muted-foreground">Paused</Text>
              </View>
            )}
          </HStack>
          <Text className="type-body-sm text-muted-foreground mt-0.5" numberOfLines={1}>
            {listing.quantityKg} kg batch volume{" "}
            {listing.status === "draft" ? "• " + listing.district : ""}
          </Text>

          <HStack className="items-center gap-2 mt-2 flex-wrap">
            <Text className="type-body-bold text-primary">
              {formatPrice(listing.pricePerKg)}
              <Text className="type-body-sm text-muted-foreground">/kg</Text>
            </Text>
            {listing.status === "sold" ? (
              <View className="bg-success-subtle px-2 py-0.5 rounded-md">
                <Text className="type-body-sm-bold text-success">
                  Paid {formatPrice(estimatedTotal)}
                </Text>
              </View>
            ) : listing.status === "draft" ? (
              <View className="bg-warning-subtle px-2 py-0.5 rounded-md">
                <Text className="type-body-sm-bold text-warning">Incomplete</Text>
              </View>
            ) : (
              <View className="bg-secondary px-2 py-0.5 rounded-md">
                <Text className="type-body-sm-bold text-secondary-foreground">
                  Est. {formatPrice(estimatedTotal)}
                </Text>
              </View>
            )}
          </HStack>
        </VStack>

        <Pressable onPress={onOptionsPress} className="p-1 active:opacity-70 shrink-0">
          <View className="text-muted-foreground">
            <DotsIcon />
          </View>
        </Pressable>
      </HStack>

      {listing.status === "pending_approval" || listing.status === "verified"
        ? renderActiveActions()
        : null}
      {listing.status === "paused" ? renderPausedActions() : null}
      {listing.status === "draft" ? renderDraftActions() : null}
      {listing.status === "sold" ? renderSoldActions() : null}
    </Pressable>
  );
}
