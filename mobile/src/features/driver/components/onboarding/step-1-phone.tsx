import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <VStack className="gap-5">
      <StepHeading title={t("driverSignUp.phone.title")} note={t("driverSignUp.phone.note")} />

      <VStack className="gap-1.5">
        <Text className="type-body-sm-bold text-foreground">
          {t("driverSignUp.phone.nameLabel")}
        </Text>
        <TextInput
          value={displayName}
          onChangeText={onChangeDisplayName}
          placeholder={t("driverSignUp.phone.namePlaceholder")}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          accessibilityLabel={t("driverSignUp.phone.nameLabel")}
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

      <NoteCard icon={PhoneIcon}>{t("driverSignUp.phone.oneAccount")}</NoteCard>
    </VStack>
  );
}
