import { TextInput } from "react-native";

import { PhoneIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { NoteCard } from "./note-card";
import { StepHeading } from "./onboarding-shell";
import { PhoneField } from "./phone-field";

/**
 * Step 1 — the number that becomes the account (Figma 196:6238).
 *
 * THE NAME FIELD IS NOT IN THE FIGMA. It is here because `registerSchema` requires
 * `displayName`, and because the farmer's pickup check shows the driver's name beside the plate
 * before produce changes hands (LP-04) — a nameless driver makes that card useless. The design
 * may intend the name to be read off the licence photo by the coordinator, but nothing
 * implements that. Worth confirming with the designer.
 */
export function Step1Phone({
  displayName,
  onChangeDisplayName,
  phone,
  onChangePhone,
  errors,
  onSubmit
}: {
  displayName: string;
  onChangeDisplayName: (value: string) => void;
  phone: string;
  onChangePhone: (value: string) => void;
  errors: { displayName?: string; phone?: string };
  onSubmit: () => void;
}) {
  return (
    <VStack className="gap-5">
      <StepHeading
        title="Your mobile number"
        note="We send a 6-digit code by SMS. Buyers and farmers see this number on the day of a pickup."
      />

      <VStack className="gap-1.5">
        <Text className="type-body-sm-bold text-foreground">Your name</Text>
        <TextInput
          value={displayName}
          onChangeText={onChangeDisplayName}
          placeholder="As farmers will know you"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          accessibilityLabel="Your name"
          className={[
            "type-body-lg h-control rounded-field border px-4 text-foreground",
            errors.displayName ? "border-destructive bg-card" : "border-border bg-card"
          ].join(" ")}
        />
        {errors.displayName ? (
          <Text className="type-caption text-destructive" accessibilityRole="alert">
            {errors.displayName}
          </Text>
        ) : null}
      </VStack>

      <PhoneField
        value={phone}
        onChangeText={onChangePhone}
        error={errors.phone}
        onSubmitEditing={onSubmit}
      />

      <NoteCard icon={PhoneIcon}>
        One number, one account. If the phone is shared at home, use your own number.
      </NoteCard>
    </VStack>
  );
}
