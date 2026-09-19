import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CROPS,
  CROP_CATEGORIES,
  cropById,
  formatBenchmarkPriceRange,
  getBenchmarkForCrop,
  type Crop,
  type CropCategory,
  type CropId
} from "@farm-pool/shared";

import { AppButton } from "@/components/app/app-button";
import { BackIcon, CheckIcon, HelpIcon, SearchIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";

type Step1CategoryInfoProps = {
  onNext?: (data: { category: CropCategory; cropId: CropId }) => void;
  onBack?: () => void;
};

const RECENT_CROP_IDS: CropId[] = ["beans", "carrot", "leeks"];

export default function Step1CategoryInfo({ onNext, onBack }: Step1CategoryInfoProps) {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<CropCategory>("Vegetables");
  const [selectedCropId, setSelectedCropId] = useState<CropId | null>("onion");
  const [searchQuery, setSearchQuery] = useState("");

  const handleShowHelp = () => {
    Alert.alert(
      "How to list your produce",
      "First choose a crop category (e.g. Vegetables), then tap the specific crop you want to sell from the list."
    );
  };

  const filteredCrops = CROPS.filter((crop) => {
    const matchesCategory = selectedCategory === "All" || crop.category === selectedCategory;
    const matchesSearch = crop.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectCrop = (cropId: CropId, category: CropCategory) => {
    setSelectedCropId(cropId);
    if (selectedCategory !== "All" && selectedCategory !== category) {
      setSelectedCategory(category);
    }
  };

  const handleContinue = () => {
    if (!selectedCropId) return;
    onNext?.({ category: selectedCategory, cropId: selectedCropId });
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-gutter gap-6 pb-28"
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
                Step 1 of 5
              </Text>
              <Text className="type-title text-foreground">Produce</Text>
            </VStack>

            <Pressable
              onPress={handleShowHelp}
              accessibilityRole="button"
              accessibilityLabel="Help"
              className="h-tap w-tap items-center justify-center rounded-field bg-secondary"
            >
              <HelpIcon />
            </Pressable>
          </HStack>

          {/* Progress bar track */}
          <Box className="h-1.5 w-full overflow-hidden rounded-pill bg-muted">
            <Box className="h-full w-1/5 rounded-pill bg-brand-deep" />
          </Box>
        </VStack>

        {/* Headline & Subtitle */}
        <VStack className="gap-1">
          <Text className="type-h2 text-foreground">What would you like to sell?</Text>
          <Text className="type-caption text-muted-foreground">Choose a crop category</Text>
        </VStack>

        {/* Category Cards Grid */}
        <HStack className="gap-2.5">
          {["Vegetables", "Grains", "Fruits"].map((catName) => {
            const isSelected = selectedCategory === catName;
            const categoryEmoji =
              catName === "Vegetables" ? "🥦" : catName === "Grains" ? "🌾" : "🍎";

            return (
              <Pressable
                key={catName}
                onPress={() => setSelectedCategory(catName as CropCategory)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className={[
                  "flex-1 items-center justify-between rounded-card p-3 shadow-sm",
                  isSelected
                    ? "border-2 border-primary bg-secondary/30"
                    : "border border-border bg-card"
                ].join(" ")}
              >
                {isSelected && (
                  <Box className="absolute right-1.5 top-1.5 h-4 w-4 items-center justify-center rounded-pill bg-primary">
                    <CheckIcon />
                  </Box>
                )}
                <Box className="mb-2 h-12 w-12 items-center justify-center rounded-field bg-secondary">
                  <Text className="type-h3">{categoryEmoji}</Text>
                </Box>
                <Text
                  className={`type-body-sm-bold text-center ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}
                  numberOfLines={1}
                >
                  {catName}
                </Text>
              </Pressable>
            );
          })}
        </HStack>

        {/* Search Input */}
        <Input className="h-control rounded-field border-border bg-card px-3">
          <InputSlot className="mr-2">
            <InputIcon as={SearchIcon} className="h-5 w-5 text-muted-foreground" />
          </InputSlot>
          <InputField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search crops (e.g. Beans, Leeks)..."
            className="type-body text-foreground"
          />
        </Input>

        {/* Recently Selected */}
        <VStack className="gap-2">
          <Text className="type-h4 text-foreground">Recently Selected</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-gutter px-gutter"
          >
            <HStack className="gap-2">
              {RECENT_CROP_IDS.map((id) => {
                const crop = cropById(id);
                if (!crop) return null;
                const isSelected = selectedCropId === crop.id;

                return (
                  <Pressable
                    key={crop.id}
                    onPress={() => handleSelectCrop(crop.id as CropId, crop.category)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={[
                      "min-h-tap flex-row items-center gap-2 rounded-chip border px-3 py-2",
                      isSelected ? "border-primary bg-secondary/40" : "border-border bg-card"
                    ].join(" ")}
                  >
                    <Text className="type-body-sm">{crop.emoji}</Text>
                    <Text
                      className={`type-body-sm-bold ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {crop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </ScrollView>
        </VStack>

        {/* Popular / Crop List */}
        <VStack className="gap-3">
          <HStack className="items-center justify-between">
            <HStack className="items-center gap-2">
              <Text className="type-h3 text-foreground">Crops</Text>
              <Box className="h-2 w-2 rounded-pill bg-primary" />
            </HStack>
            <Text className="type-caption-bold uppercase text-muted-foreground">Top Traded</Text>
          </HStack>

          <VStack className="gap-2.5">
            {filteredCrops.length === 0 ? (
              <Box className="rounded-card border border-border bg-card p-6 items-center">
                <Text className="type-body text-muted-foreground">No crops found</Text>
              </Box>
            ) : (
              filteredCrops.map((crop) => {
                const isSelected = selectedCropId === crop.id;

                return (
                  <Pressable
                    key={crop.id}
                    onPress={() => handleSelectCrop(crop.id, crop.category)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={[
                      "elevation-card min-h-tap flex-row items-center justify-between rounded-card p-3",
                      isSelected
                        ? "border-2 border-primary bg-secondary/20"
                        : "border border-border bg-card"
                    ].join(" ")}
                  >
                    <HStack className="flex-1 items-center gap-3">
                      <CropTile emoji={crop.emoji} />
                      <VStack className="flex-1 gap-0.5">
                        <HStack className="items-center gap-2">
                          <Text className="type-body-bold text-foreground">{crop.name}</Text>
                          {crop.highDemand && (
                            <Box className="rounded-chip bg-warning-subtle px-2 py-0.5">
                              <Text className="type-body-sm-bold text-warning">High Demand</Text>
                            </Box>
                          )}
                        </HStack>
                        <Text className="type-caption text-muted-foreground">
                          Avg. Market:{" "}
                          {(() => {
                            const bm = getBenchmarkForCrop(crop.id as CropId);
                            return formatBenchmarkPriceRange(bm.lowPrice, bm.highPrice);
                          })()}
                        </Text>
                      </VStack>
                    </HStack>

                    {isSelected && (
                      <Box className="h-7 w-7 items-center justify-center rounded-pill bg-primary">
                        <CheckIcon />
                      </Box>
                    )}
                  </Pressable>
                );
              })
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Sticky Bottom Action Area */}
      <View
        className="border-t border-border bg-card p-gutter"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <AppButton label="Continue" disabled={!selectedCropId} onPress={handleContinue} />
      </View>
    </View>
  );
}
