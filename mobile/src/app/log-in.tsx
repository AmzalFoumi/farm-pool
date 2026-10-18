/**
 * Log in — phone + password, reached from the welcome screen.
 *
 * A wrong number and a wrong password produce the same message, because the
 * api deliberately does not say which (`.plans/auth/README.md`). The error is
 * shown once, above the button, rather than under a field for that reason.
 *
 * On success nothing here navigates: `AuthProvider` flips to `signed-in` and the root
 * `Stack.Protected` swaps onboarding out for the right shell — a pending or suspended account
 * (FARM-44) lands on `/account-status` instead of a tab shell, same guard that handles role.
 */

import { loginSchema, type LoginInput } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useResolveClassNames } from "uniwind";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { WordmarkIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type FieldErrors = Partial<Record<"identifier" | "password", string>>;

export default function LogInScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { t } = useTranslation();
  /* The wordmark is an SVG, so it takes a colour value rather than a className. */
  const wordmarkColor = useResolveClassNames("text-brand-deep").color as string;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);

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
    <View className="flex-1 bg-card">
      {/* Plain and untitled. No rule under the bar and no outline on the back button — the fields
          carry their own off-white fill, so the screen separates itself by what takes input rather
          than by lines. No title because the body opens with "Welcome back" at `type-h1`, and the
          bar would be the same words again in a smaller size. What is left is the way back. */}
      <AppBar variant="plain" />

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
            {/* The wordmark, then the sentence. A form that opens straight into a field says
                nothing about where you are; the mark and two lines cost one screenful of nothing
                and tell a driver who has been away for a week that they are in the right app.

                The same asset the welcome hero carries, in `brand-deep` rather than white because
                here it sits on a white screen — the SVG is `currentColor`, so one token decides
                it. Half the hero size: there it is the subject, here it is a signature. */}
            <WordmarkIcon width={132} color={wordmarkColor} />

            <VStack className="gap-2 pb-2">
              <Text className="type-h1 text-foreground">{t("logIn.heading")}</Text>
              <Text className="type-body-lg text-muted-foreground">{t("logIn.note")}</Text>
            </VStack>

            <AppTextField
              variant="filled"
              labelHidden
              label={t("logIn.phoneLabel")}
              value={identifier}
              onChangeText={setIdentifier}
              error={errors.identifier}
              /* The field name, not the format example it used to show. With the label gone the
                 placeholder is the only thing naming the field, and "077 123 4567" on its own
                 leaves a driver looking at a box of digits with nothing saying what they are for. */
              placeholder={t("logIn.phoneLabel")}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
            />

            <AppTextField
              variant="filled"
              labelHidden
              label={t("logIn.passwordLabel")}
              placeholder={t("logIn.passwordLabel")}
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

            <AppButton
              label={submitting ? t("logIn.actionBusy") : t("logIn.action")}
              disabled={submitting}
              onPress={submit}
            />

            {/* Forgot password, answered honestly. There is no reset endpoint and no email on the
                account, so the link does not pretend to send one — it says who can actually do it.
                A dead link here would teach the driver the screen is decorative, which costs more
                than the line it saves. */}
            <Pressable
              onPress={() => setShowReset((shown) => !shown)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showReset }}
              className="min-h-tap items-center justify-center"
            >
              <Text className="type-body-bold text-primary">{t("logIn.forgot")}</Text>
            </Pressable>

            {showReset ? (
              <Text className="type-body px-2 text-center text-muted-foreground">
                {t("logIn.forgotHelp")}
              </Text>
            ) : null}

            {/* The two paths are not equals, so they do not look alike: logging in is the filled
                button above, and the divider is what says the thing under it is the other
                road rather than a second try at this one. */}
            <HStack className="items-center gap-3 py-1">
              <Box className="h-px flex-1 bg-border" />
              <Text className="type-body-sm text-muted-foreground">{t("logIn.or")}</Text>
              <Box className="h-px flex-1 bg-border" />
            </HStack>

            <AppButton
              label={t("common.signUp")}
              variant="outline"
              onPress={() => router.replace("/sign-up-as")}
            />
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
