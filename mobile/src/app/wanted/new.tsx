/**
 * New crop request. Crop is picked from the shared `CROPS` list as chips (one tap each, no
 * dropdown to fight with outdoors); dates are typed as YYYY-MM-DD until a date picker is chosen
 * (`.plans/DECISIONS.md`). Validation runs `createWantedSchema` before the round trip so the
 * messages match what the api would say.
 */

import { CROPS, createWantedSchema, type CropId } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { wantedApi } from "@/features/wanted/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type Field = "cropId" | "quantityKg" | "maxPricePerKg" | "neededBy" | "district";
type FieldErrors = Partial<Record<Field, string>>;

export default function NewWantedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [cropId, setCropId] = useState<CropId | null>(null);
  const [quantity, setQuantity] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [district, setDistrict] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFormError(null);
    const parsed = createWantedSchema.safeParse({
      cropId: cropId ?? undefined,
      quantityKg: quantity.trim() === "" ? undefined : Number(quantity),
      maxPricePerKg: maxPrice.trim() === "" ? undefined : Number(maxPrice),
      neededBy: neededBy.trim(),
      district
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      if (next.cropId) next.cropId = "Pick a crop";
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await wantedApi.create(token ?? "", parsed.data);
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.code === "validation_error") {
        const next: FieldErrors = {};
        for (const issue of e.issues) next[issue.path as Field] ??= issue.message;
        setErrors(next);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Could not save the request");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppBar title="New request" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-4 p-gutter"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="gap-2">
            <Text className="type-body-bold text-foreground">Crop</Text>
            <HStack className="flex-wrap gap-2">
              {CROPS.map((crop) => {
                const selected = crop.id === cropId;
                return (
                  <Pressable
                    key={crop.id}
                    onPress={() => setCropId(crop.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={crop.name}
                    className={[
                      "min-h-tap flex-row items-center gap-1.5 rounded-chip border px-4",
                      selected ? "border-primary bg-primary" : "border-border bg-card"
                    ].join(" ")}
                  >
                    <Text className="type-body">{crop.emoji}</Text>
                    <Text
                      className={`type-body-sm-bold ${
                        selected ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {crop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
            {errors.cropId ? (
              <Text className="type-caption text-destructive">{errors.cropId}</Text>
            ) : null}
          </VStack>

          <AppTextField
            label="Quantity (kg)"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            error={errors.quantityKg}
          />
          <AppTextField
            label="Max price per kg (optional)"
            value={maxPrice}
            onChangeText={setMaxPrice}
            keyboardType="decimal-pad"
            placeholder="Rs"
            error={errors.maxPricePerKg}
          />
          <AppTextField
            label="Needed by"
            value={neededBy}
            onChangeText={setNeededBy}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            error={errors.neededBy}
          />
          <AppTextField
            label="District"
            value={district}
            onChangeText={setDistrict}
            placeholder="e.g. Kurunegala"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            error={errors.district}
          />

          {formError ? <Text className="type-caption text-destructive">{formError}</Text> : null}

          <AppButton
            label={submitting ? "Saving…" : "Post request"}
            onPress={() => void submit()}
            disabled={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
