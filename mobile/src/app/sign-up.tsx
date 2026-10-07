/**
 * Sign up — the account form, reached from the role picker with `?role=`.
 *
 * Validation runs twice on purpose and against the same object: here with
 * `registerSchema` before the request (instant, offline, per-field messages),
 * and again on the api. If the two ever disagree the api wins, and its
 * `validation_error` issues are shown under the same fields.
 *
 * On success nothing here navigates: `AuthProvider` flips to `signed-in`, the
 * root `Stack.Protected` swaps the onboarding group for the app group, and the
 * user lands on the tab shell with no onboarding screen left in history.
 *
 * A farmer also names the district they farm in (FARM-44), used to route them to the
 * coordinator who covers it. That's a `coordination` write, not an `identity` one, so it is a
 * second call made right after `signUp` resolves — same shape as the driver sign-up saving its
 * vehicle onto the account it just created — not a field on `registerSchema` itself. A farmer
 * starts `pending_review`: this screen does not navigate anywhere special for that, the root
 * layout's status guard already sends them to `/account-status`.
 *
 * `phone_taken` tries a sign-in with the same phone + password before showing "already exists":
 * a pending farmer re-submitting this form (thinking that is how to check in, or to retry a
 * district) is the common case, and signing them straight back into their existing — still
 * pending — account is kinder than making them find the "log in instead" link.
 */

import { DISTRICT_NAMES, registerSchema, roleSchema, type RegisterInput } from "@farm-pool/shared";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
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
import { coordinationApi } from "@/features/coordination/api";
import { DistrictChip } from "@/features/driver/components/vehicle-wizard/district-chip";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

const ROLE_LABEL = {
  farmer: "farmer",
  buyer: "wholesale buyer",
  coordinator: "area coordinator",
  logistics: "delivery partner"
} as const;

type Field = "displayName" | "phone" | "password" | "district";
type FieldErrors = Partial<Record<Field, string>>;

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [district, setDistrict] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneTaken, setPhoneTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* A bad or missing role (a stale deep link, say) goes back to the picker
     rather than creating an account with a guessed role. */
  const role = roleSchema.safeParse(params.role);
  if (!role.success) return <Redirect href="/sign-up-as" />;
  const isFarmer = role.data === "farmer";

  const submit = async () => {
    setFormError(null);
    setPhoneTaken(false);

    const input: RegisterInput = { displayName, phone, password, role: role.data };
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(issuesToFields(parsed.error.issues));
      return;
    }
    if (isFarmer && !district) {
      setErrors({ district: "Pick the district you farm in" });
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const { token } = await auth.signUp(input);
      if (isFarmer && district) {
        // Not fatal: the account exists and is signed in regardless. A dropped connection or an
        // uncovered district just leaves the retry on /account-status to finish the job.
        try {
          await coordinationApi.apply(token, district);
        } catch {
          // Swallowed here; /account-status offers the same picker to retry.
        }
      }
      // Signed in: the root layout's guard takes it from here.
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "phone_taken") {
          // Likely the same person retrying — a pending farmer re-submitting the same form,
          // say — rather than someone else's number. Try signing them in with what they just
          // typed before showing "already exists": on success this lands them wherever the
          // root guard sends their account today, /account-status included if still pending.
          try {
            await auth.signIn({ identifier: parsed.data.phone, password: parsed.data.password });
            return;
          } catch {
            // Not them, or a different password — fall through to the normal message.
          }
          setPhoneTaken(true);
          setErrors({ phone: "An account with this number already exists" });
        } else if (error.code === "validation_error") {
          setErrors(issuesToFields(error.issues));
        } else if (error.code === "network_error") {
          setFormError("Can't reach the server. Check your connection and try again.");
        } else {
          setFormError("Something went wrong. Please try again.");
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <AppBar title={`Sign up as ${ROLE_LABEL[role.data]}`} />

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
            <Text className="type-body text-muted-foreground">
              Your phone number is your account. You will use it to log in.
            </Text>

            <AppTextField
              label="Your name"
              value={displayName}
              onChangeText={setDisplayName}
              error={errors.displayName}
              placeholder="As people know you"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />

            <AppTextField
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              placeholder="077 123 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
            />

            <AppTextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="At least 8 characters"
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType={isFarmer ? "next" : "done"}
              onSubmitEditing={isFarmer ? undefined : submit}
            />

            {isFarmer ? (
              <VStack className="gap-1">
                <Text className="type-body-bold text-foreground">
                  Which district do you farm in?
                </Text>
                <Text className="type-caption text-muted-foreground">
                  Your area coordinator reviews new farmers before they can start listing.
                </Text>
                {errors.district ? (
                  <Text className="type-caption text-destructive">{errors.district}</Text>
                ) : null}
                <HStack className="flex-wrap gap-2 pt-1" accessibilityRole="radiogroup">
                  {DISTRICT_NAMES.map((name) => (
                    <DistrictChip
                      key={name}
                      name={name}
                      selected={district === name}
                      onPress={() => setDistrict(name)}
                    />
                  ))}
                </HStack>
              </VStack>
            ) : null}

            {phoneTaken ? (
              <Pressable
                onPress={() => router.replace("/log-in")}
                accessibilityRole="link"
                className="min-h-tap justify-center"
              >
                <Text className="type-body-bold text-primary">Log in instead</Text>
              </Pressable>
            ) : null}

            {formError ? (
              <Text className="type-body text-destructive" accessibilityRole="alert">
                {formError}
              </Text>
            ) : null}
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        className="border-t border-border bg-card px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 23) }}
      >
        <AppButton
          label={submitting ? "Creating your account…" : "Create account"}
          disabled={submitting}
          onPress={submit}
        />
      </View>
    </View>
  );
}

/** First message per field, from zod issues or the api's `issues`. */
function issuesToFields(issues: readonly { path: PropertyKey[] | string; message: string }[]) {
  const fields: FieldErrors = {};
  for (const issue of issues) {
    const key = (Array.isArray(issue.path) ? issue.path[0] : issue.path) as Field | undefined;
    if (key && !fields[key]) fields[key] = issue.message;
  }
  return fields;
}
