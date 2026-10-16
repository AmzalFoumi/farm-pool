import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { LeafIcon } from "@/components/app/icons";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const user = auth.user;

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
      {/* ── App Header ────────────────────────────────────────────── */}
      <View className="border-b border-border bg-card px-gutter py-3.5">
        <VStack>
          <Text className="type-caption-bold text-muted-foreground uppercase">
            {t("farmer.profile.title")}
          </Text>
          <Heading className="type-title text-foreground">{t("farmer.profile.heading")}</Heading>
        </VStack>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-gutter pt-4 pb-12 gap-5">
        {/* ── Profile Header Card ────────────────────────────────── */}
        <Card className="bg-card p-4.5 border-border gap-3">
          <HStack className="items-center gap-3.5">
            <Box className="h-14 w-14 items-center justify-center rounded-pill bg-brand-deep">
              <LeafIcon />
            </Box>
            <VStack className="flex-1 gap-0.5">
              <HStack className="items-center gap-2">
                <Text className="type-h3 text-foreground">
                  {user?.displayName ?? "Farmer User"}
                </Text>
                <Badge variant="outline" className="bg-secondary border-border">
                  <Text className="type-caption-bold text-primary">{t("farmer.profile.role")}</Text>
                </Badge>
              </HStack>
              <Text className="type-body text-muted-foreground">{user?.phone ?? "No phone"}</Text>
            </VStack>
          </HStack>
        </Card>

        {/* ── Farm & Account Details ──────────────────────────────── */}
        <VStack className="gap-2.5">
          <Text className="type-body-bold text-foreground">{t("farmer.profile.accountInfo")}</Text>
          <Card className="bg-card p-4 border-border gap-3">
            <HStack className="items-center justify-between">
              <Text className="type-body text-muted-foreground">
                {t("farmer.profile.accountStatus")}
              </Text>
              <Badge variant="outline" className="bg-success-subtle border-transparent">
                <Text className="type-caption-bold text-success">
                  {user?.status ? user.status.toUpperCase() : "ACTIVE"}
                </Text>
              </Badge>
            </HStack>

            <View className="h-px bg-border" />

            <HStack className="items-center justify-between">
              <Text className="type-body text-muted-foreground">
                {t("farmer.profile.registeredRole")}
              </Text>
              <Text className="type-body-bold text-foreground">{t("farmer.profile.producer")}</Text>
            </HStack>
          </Card>
        </VStack>

        {/* ── Support & Direct Contact ───────────────────────────── */}
        <VStack className="gap-2.5">
          <Text className="type-body-bold text-foreground">{t("farmer.profile.help")}</Text>
          <Card className="bg-card p-4 border-border gap-2">
            <Text className="type-body-bold text-foreground">
              {t("farmer.profile.coordinatorSupport")}
            </Text>
            <Text className="type-body text-muted-foreground">
              Need help with crop transport or buyers? Contact your regional coordinator directly.
            </Text>
          </Card>
        </VStack>

        {/* ── Sign Out Button ────────────────────────────────────── */}
        <VStack className="pt-4">
          <AppButton
            label={signingOut ? "Logging out…" : t("profile.logOut")}
            variant="outline"
            disabled={signingOut}
            onPress={handleSignOut}
          />
        </VStack>
      </ScrollView>
    </View>
  );
}
