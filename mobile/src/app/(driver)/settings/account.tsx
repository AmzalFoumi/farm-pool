/**
 * Account details — reached from the identity row at the top of the profile.
 *
 * **Read-only, and it says so.** Nothing in the api edits a name or a phone number: the phone is
 * the account's identity and was verified at sign-up (`.plans/auth/README.md`), and there is no
 * endpoint behind a change to either. So this screen shows what is on file and names who can
 * change it, rather than offering fields that would fail on save.
 *
 * It exists because the row above it has to go somewhere. An identity card that looks tappable and
 * is not teaches the driver the screen is decorative — the same argument the profile makes about
 * tiles that go nowhere — and the honest fix is a small true screen, not a disabled card.
 */

import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";

import { AppBar } from "@/components/app/app-bar";
import { Text } from "@/components/ui/text";
import { SettingsGroup } from "@/features/driver/components/profile/settings-group";
import { SettingsRow } from "@/features/driver/components/profile/settings-row";
import { useAuth } from "@/providers/auth-provider";

export default function AccountSettingsScreen() {
  const { t } = useTranslation();
  const auth = useAuth();

  if (auth.status !== "signed-in") return null;
  const { user } = auth;

  return (
    <View className="flex-1 bg-card">
      <AppBar title={t("profile.accountDetails")} variant="plain" />

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-gutter pb-10 pt-2">
        {/* No `onPress` on any of these, so they render as text and carry no chevron. */}
        <SettingsGroup>
          <SettingsRow label={t("profile.name")} value={user.displayName} />
          <SettingsRow label={t("common.phone")} value={user.phone} />
          <SettingsRow label={t("profile.role")} value={t(`roles.${user.role}`)} />
        </SettingsGroup>

        <Text className="type-body-sm px-1 text-muted-foreground">
          {t("profile.accountReadOnly")}
        </Text>
      </ScrollView>
    </View>
  );
}
