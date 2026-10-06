/**
 * Log in — phone + password, reached from the welcome screen.
 *
 * A wrong number and a wrong password produce the same message, because the
 * api deliberately does not say which (`.plans/auth/README.md`). The error is
 * shown once, above the button, rather than under a field for that reason.
 *
 * On success nothing here navigates: `AuthProvider` flips to `signed-in` and
 * the root `Stack.Protected` swaps onboarding out for the tab shell.
 */

import { loginSchema, type LoginInput } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type FieldErrors = Partial<Record<"identifier" | "password", string>>;

export default function LogInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { t } = useTranslation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFormError(null);

    const input: LoginInput = { identifier, password };
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await auth.signIn(parsed.data);
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_credentials") {
        setFormError(t("errors.invalid_credentials"));
      } else if (error instanceof ApiError && error.code === "network_error") {
        setFormError(t("errors.network"));
      } else {
        setFormError(t("errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("logIn.title")} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-gutter pt-5 pb-6"
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="gap-4">
            <AppTextField
              label={t("logIn.phoneLabel")}
              value={identifier}
              onChangeText={setIdentifier}
              error={errors.identifier}
              placeholder={t("logIn.phonePlaceholder")}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
            />

            <AppTextField
              label={t("logIn.passwordLabel")}
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secure
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            {formError ? (
              <Text className="type-body text-destructive" accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}

            <Pressable
              onPress={() => router.replace("/sign-up-as")}
              accessibilityRole="link"
              className="min-h-tap justify-center"
            >
              <Text className="type-body text-muted-foreground">
                {t("logIn.newHere")}{" "}
                <Text className="type-body-bold text-primary">{t("common.signUp")}</Text>
              </Text>
            </Pressable>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-t border-border bg-card px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <AppButton
          label={submitting ? t("logIn.actionBusy") : t("logIn.action")}
          disabled={submitting}
          onPress={submit}
        />
      </View>
    </View>
  );
}
