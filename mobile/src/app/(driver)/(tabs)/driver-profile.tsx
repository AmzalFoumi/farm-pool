/**
 * The delivery partner's profile (FARM-45, LP-06) — the root of everything about *them* rather
 * than about today's work.
 *
 * SHAPE. An identity row, the verification card, then short grouped lists. It was a loose stack:
 * a name, two square tiles, a vehicle card, three language chips and a sign-out button, each a
 * different shape, all on one scroll. Rows in groups say the same things in a fraction of the
 * height and let a driver skip two groups to reach the third — and the settings that used to be
 * inline now have screens of their own (`settings/language`, `settings/account`), which is what
 * freed the room.
 *
 * The language switch is still reachable here, which is the point of it existing at all: it was
 * nowhere after sign-up, so a driver who tapped the wrong chip on the welcome screen had no way
 * back — a poor joke on an app whose requirement (LP-91) is full Sinhala and Tamil. It is one row
 * deeper now, and the row says which language is on, so the trip is only ever to change it.
 *
 * NO ICON PER ROW, unlike the reference layout this follows. `icons.tsx` holds the glyphs Figma
 * exported and nothing for "language" or "account"; hand-drawing six more would make this the
 * third screen carrying invented marks (`.plans/DECISIONS.md`, open question 1). A labelled row
 * with its current value on the right reads fine without one, and adding them later changes no
 * structure.
 *
 * EVERY ROW GOES SOMEWHERE REAL. The reference has Badges, Plan & Subscription, Privacy Policy and
 * the rest; FarmPool has deliveries, a vehicle, a language and a way out. A row that goes nowhere
 * is a dead tap that teaches the driver the screen is decorative, which costs more than the
 * emptier list it saves.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { SettingsGroup } from "@/features/driver/components/profile/settings-group";
import { SettingsRow } from "@/features/driver/components/profile/settings-row";
import { VerificationCard } from "@/features/driver/components/profile/verification-card";
import { logisticsApi } from "@/features/logistics/api";
import { LANGUAGES } from "@/lib/i18n";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { language } = useLocale();
  const [signingOut, setSigningOut] = useState(false);

  const token = auth.token ?? "";
  /* Only for the count on the Deliveries row, so a failure here must not take the screen down —
     the profile is still useful without it, and the row simply shows no value. */
  const history = useRequest(() => logisticsApi.history(token), token);

  if (auth.status !== "signed-in") return null;
  const { user } = auth;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const languageLabel = LANGUAGES.find((l) => l.code === language)?.label;

  return (
    <View className="flex-1 bg-card" style={{ paddingTop: insets.top }}>
      <AppBar title={t("profile.title")} variant="plain" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-gutter pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Who they are ─────────────────────────────────────────────── */}
        <SettingsGroup>
          <SettingsRow
            label={user.displayName}
            note={user.phone}
            onPress={() => router.push("/(driver)/settings/account")}
            testID="profile-account-row"
            accessory={
              /* Initials rather than a photo: nothing in the app uploads one, and a grey
                 silhouette would be a placeholder for a feature that does not exist. */
              <Box className="h-11 w-11 items-center justify-center rounded-pill bg-brand-deep">
                <Text className="type-body-bold text-brand-deep-foreground">
                  {initialsOf(user.displayName)}
                </Text>
              </Box>
            }
          />
        </SettingsGroup>

        {/* ── Where the check stands ───────────────────────────────────── */}
        {user.driver ? (
          <VerificationCard
            status={user.driver.verification}
            onPress={() => router.push("/driver-vehicle")}
          />
        ) : null}

        {/* ── Their work ───────────────────────────────────────────────── */}
        <SettingsGroup title={t("profile.groupWork")}>
          <SettingsRow
            label={t("profile.deliveries")}
            value={
              history.status === "ready"
                ? t("profile.deliveriesCount", { count: history.data.length })
                : undefined
            }
            onPress={() => router.push("/(driver)/deliveries")}
          />
          <SettingsRow
            label={t("profile.vehicle")}
            value={user.driver?.registration}
            onPress={() => router.push("/driver-vehicle")}
          />
        </SettingsGroup>

        {/* ── The app ──────────────────────────────────────────────────── */}
        <SettingsGroup title={t("profile.groupApp")}>
          <SettingsRow
            label={t("profile.language")}
            value={languageLabel}
            onPress={() => router.push("/(driver)/settings/language")}
            testID="profile-language-row"
          />
          <SettingsRow
            label={t("profile.accountDetails")}
            onPress={() => router.push("/(driver)/settings/account")}
          />
        </SettingsGroup>

        {/* ── Out ──────────────────────────────────────────────────────── */}
        {/* Its own group, away from everything else: the one row here that pressing back does not
            undo. `destructive` rather than the harvest orange — orange already means "pending" on
            the order lifecycle (CLAUDE.md rule 5). */}
        <SettingsGroup>
          <SettingsRow
            label={signingOut ? t("profile.loggingOut") : t("profile.logOut")}
            tone="destructive"
            onPress={() => void handleSignOut()}
          />
        </SettingsGroup>

        <VStack className="items-center pt-2">
          <Text className="type-body-sm text-muted-foreground">
            {t("profile.appVersion", { version: "1.0.0" })}
          </Text>
        </VStack>
      </ScrollView>
    </View>
  );
}

/** "Lakindu Rathmanagolla" → "LR". One letter when there is only one word. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
