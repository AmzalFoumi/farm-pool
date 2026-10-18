/**
 * Language — reached from the profile.
 *
 * It was three chips wedged under a heading on the profile itself. Moving it to its own screen is
 * what lets the profile be a list of one-line rows, and costs the driver one tap for something
 * they change roughly once ever. The row they came from shows the current language, so the trip is
 * only ever to change it, never to check it.
 *
 * **A list, not the segmented toggle.** The toggle is right where the options are a glance apart —
 * the welcome sheet, where it sits under a heading and above a button. Given a whole screen, rows
 * read better: each language gets its own line in its own script, at its own full width, with the
 * chosen one ticked. The same three options, told the way a screen tells things.
 */

import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";

import { AppBar } from "@/components/app/app-bar";
import { CheckMarkIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { SettingsGroup } from "@/features/driver/components/profile/settings-group";
import { SettingsRow } from "@/features/driver/components/profile/settings-row";
import { LANGUAGES } from "@/lib/i18n";
import { useLocale } from "@/providers/locale-provider";

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLocale();

  return (
    <View className="flex-1 bg-card">
      <AppBar title={t("profile.language")} variant="plain" />

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-gutter pb-10 pt-2">
        <Text className="type-body text-muted-foreground">{t("profile.languageNote")}</Text>

        <SettingsGroup>
          {LANGUAGES.map(({ code, label, endonym }) => {
            const selected = language === code;
            return (
              <SettingsRow
                key={code}
                label={label}
                /* The English name under the endonym: a driver who tapped the wrong one on the
                   welcome screen is now reading a script they cannot read, and this is the line
                   that gets them back. */
                note={endonym}
                onPress={() => setLanguage(code)}
                testID={`settings-language-${code}`}
                accessory={
                  selected ? (
                    <Box className="h-7 w-7 items-center justify-center rounded-pill bg-primary">
                      <CheckMarkIcon color="#ffffff" />
                    </Box>
                  ) : (
                    /* Holds the tick's width on every row, so the labels do not shift sideways
                       as the selection moves. */
                    <Box className="h-7 w-7" />
                  )
                }
              />
            );
          })}
        </SettingsGroup>

        <VStack className="gap-1">
          <Text className="type-body-sm text-muted-foreground">{t("profile.languageSaved")}</Text>
        </VStack>
      </ScrollView>
    </View>
  );
}
