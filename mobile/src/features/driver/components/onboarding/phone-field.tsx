import { TextInput } from "react-native";

import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * The country prefix beside the national number (Figma 196:6251 / 196:6255).
 *
 * The `+94` box is deliberately **not** a picker, despite the chevron in the design. FarmPool is
 * Sri Lanka only — `phoneSchema` in `packages/shared` accepts nothing else and the api normalises
 * every number to `+94` — so a country list would offer 200 choices of which 199 fail validation
 * one screen later. It is rendered as a static affix, and the chevron is dropped rather than
 * drawn as a control that does nothing.
 */
export function PhoneField({
  value,
  onChangeText,
  error,
  onSubmitEditing
}: {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  onSubmitEditing?: () => void;
}) {
  return (
    <VStack className="gap-1.5">
      <HStack className="gap-2.5">
        <HStack className="h-[62px] items-center justify-center rounded-field border border-border bg-muted px-5">
          <Text className="type-body-bold text-muted-foreground">+94</Text>
        </HStack>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder="77 123 4567"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="done"
          accessibilityLabel="Your mobile number, without the country code"
          className={[
            "type-body-lg h-[62px] flex-1 rounded-field border px-4 text-foreground",
            error ? "border-destructive bg-card" : "border-border bg-card"
          ].join(" ")}
        />
      </HStack>

      {error ? (
        <Text className="type-caption text-destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </VStack>
  );
}
