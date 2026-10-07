/**
 * The delivery partner's profile (FARM-45, LP-06): who they are, the vehicle farmers will see,
 * where its check stands (LP-03), what they have carried, and the language the app speaks.
 *
 * LAYOUT. Name and face first, squares for the places worth jumping to, then the vehicle a farmer
 * checks at the gate, then the settings nobody opens twice. Every square goes somewhere real — a
 * grid is easy to pad with plausible labels, and each padded one is a dead tap that teaches the
 * driver the screen is decorative.
 *
 * The language switch lives here because it existed **nowhere** after sign-up: a driver who tapped
 * the wrong chip on the welcome screen had no way back, which is a poor joke on an app whose
 * requirement (LP-91) is full Sinhala and Tamil.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { DeliveryIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { LANGUAGES } from "@/lib/i18n";
import { ProfileTile } from "@/features/driver/components/profile/profile-tile";
import { VehicleCard } from "@/features/driver/components/profile/vehicle-card";
import { logisticsApi } from "@/features/logistics/api";
import { DriverVerificationPill } from "@/features/orders/status-pill";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function DriverProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { language, setLanguage } = useLocale();
  const [signingOut, setSigningOut] = useState(false);

  const token = auth.token ?? "";
  /* Only for the count on the tile, so a failure here must not take the screen down — the profile
     is still useful without it. `useRequest` already swallows nothing, so the count simply stays
     blank if the request fails. */
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

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-gutter pb-12 pt-6">
        {/* ── Who they are ─────────────────────────────────────────────── */}
        <HStack className="items-start justify-between gap-4">
          <VStack className="flex-1 gap-2">
            <Text className="type-h2 text-foreground">{user.displayName}</Text>
            <HStack className="items-center gap-2">
              <Text className="type-body text-muted-foreground">{user.phone}</Text>
              {user.driver ? <DriverVerificationPill status={user.driver.verification} /> : null}
            </HStack>
          </VStack>

          {/* Initials rather than a photo: nothing in the app uploads one, and a grey silhouette
              would be a placeholder for a feature that does not exist. */}
          <Box className="h-16 w-16 items-center justify-center rounded-pill bg-brand-deep">
            <Text className="type-h3 text-brand-deep-foreground">
              {initialsOf(user.displayName)}
            </Text>
          </Box>
        </HStack>

        {/* ── The places worth jumping to ──────────────────────────────── */}
        {/* Two, not the three the reference layout shows. A third would have to be Help or
            Earnings, and neither exists — a tile that goes nowhere teaches the driver the screen
            is decorative, which costs more than an empty column. */}
        <HStack className="gap-3">
          <ProfileTile
            label={t("profile.deliveries")}
            value={
              history.status === "ready"
                ? t("profile.deliveriesCount", { count: history.data.length })
                : undefined
            }
            icon={<DeliveryIcon size={24} />}
            onPress={() => router.push("/(driver)/deliveries")}
          />
          <ProfileTile
            label={t("profile.vehicle")}
            value={user.driver?.registration}
            icon={<DeliveryIcon size={24} />}
            onPress={() => router.push("/driver-vehicle")}
          />
        </HStack>

        {/* ── What a farmer sees at the gate ───────────────────────────── */}
        {user.driver ? (
          <VehicleCard driver={user.driver} onEdit={() => router.push("/driver-vehicle")} />
        ) : null}

        {/* ── Language ─────────────────────────────────────────────────── */}
        <VStack className="gap-2.5">
          <Text className="type-body-bold text-foreground">{t("profile.language")}</Text>
          <HStack className="gap-2" accessibilityRole="radiogroup">
            {LANGUAGES.map(({ code, label, endonym }) => {
              const selected = language === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => setLanguage(code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  /* The visible label is in its own script; the reader gets the English name, so
                     a user whose screen reader has no Sinhala voice still hears which is which. */
                  accessibilityLabel={endonym}
                  testID={`profile-language-${code}`}
                  className={[
                    "min-h-tap flex-1 items-center justify-center rounded-chip",
                    selected ? "bg-secondary" : "border border-border bg-card"
                  ].join(" ")}
                >
                  <Text
                    className={`type-body-bold ${
                      selected ? "text-secondary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        </VStack>

        <AppButton
          label={signingOut ? t("profile.loggingOut") : t("profile.logOut")}
          variant="outline"
          disabled={signingOut}
          onPress={() => void handleSignOut()}
        />
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
