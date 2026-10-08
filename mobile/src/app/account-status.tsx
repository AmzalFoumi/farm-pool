/**
 * Shown instead of any tab shell while a signed-in account is not `active` (FARM-44) — a farmer
 * waiting on their coordinator, or anyone suspended.
 *
 * "Check status" deliberately calls `authApi.me` directly rather than `auth.refresh()`: the
 * token already carries `status`, and a status change is not seen until a fresh token is
 * issued (`.plans/auth/README.md`). Updating `auth.user` in place here would make the client
 * think it is active while every real request still 403s with `account_pending_review` on the
 * stale token — so this only *reads* the live status to decide what to tell the farmer, and the
 * way out is always a genuine log out + log back in, never a silent state flip.
 *
 * "Go to home" reads as a plain exit, but under the hood it is a sign-out: `index` (the welcome
 * screen) only exists in the root Stack's signed-out group, so there is no way to reach it
 * without ending the session — same mechanism as every other "Log out" button, relabelled for
 * where it actually sends someone from here.
 */

import { DISTRICT_NAMES } from "@farm-pool/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { DistrictChip } from "@/features/driver/components/vehicle-wizard/district-chip";
import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import { useAuth } from "@/providers/auth-provider";

export default function AccountStatusScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const { t } = useTranslation();
  const [district, setDistrict] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  if (auth.status !== "signed-in") return null;
  const { user, token } = auth;
  const suspended = user.status === "suspended";

  const retryApply = async () => {
    if (!district) return;
    setApplying(true);
    setApplyMessage(null);
    try {
      await coordinationApi.apply(token, district);
      setApplyMessage(t("accountStatus.applied", { district }));
    } catch (error) {
      setApplyMessage(
        error instanceof ApiError && error.code === "no_cooperative_for_district"
          ? t("accountStatus.noCooperative", { district })
          : t("errors.network")
      );
    } finally {
      setApplying(false);
    }
  };

  const checkStatus = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      const fresh = await authApi.me(token);
      setCheckMessage(
        fresh.status === "active"
          ? t("accountStatus.approved")
          : fresh.status === "suspended"
            ? (fresh.rejectionReason ?? t("accountStatus.suspended"))
            : t("accountStatus.stillPending")
      );
    } catch {
      setCheckMessage(t("errors.network"));
    } finally {
      setChecking(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-gutter"
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <VStack className="gap-2">
          <Text className="type-h2 text-foreground">
            {suspended ? t("accountStatus.suspendedTitle") : t("accountStatus.pendingTitle")}
          </Text>
          <Text className="type-body text-muted-foreground">
            {suspended
              ? (user.rejectionReason ?? t("accountStatus.suspendedBody"))
              : t("accountStatus.pendingBody")}
          </Text>
        </VStack>

        {!suspended && user.role === "farmer" ? (
          <VStack className="gap-3 rounded-card border border-border bg-card p-4">
            <VStack className="gap-1">
              <Text className="type-body-bold text-foreground">
                {t("accountStatus.retryTitle")}
              </Text>
              <Text className="type-caption text-muted-foreground">
                {t("accountStatus.retryNote")}
              </Text>
            </VStack>
            <HStack className="flex-wrap gap-2" accessibilityRole="radiogroup">
              {DISTRICT_NAMES.map((name) => (
                <DistrictChip
                  key={name}
                  name={name}
                  selected={district === name}
                  onPress={() => setDistrict(name)}
                />
              ))}
            </HStack>
            {applyMessage ? (
              <Text className="type-caption text-muted-foreground">{applyMessage}</Text>
            ) : null}
            <AppButton
              label={applying ? t("accountStatus.applyBusy") : t("accountStatus.apply")}
              variant="outline"
              disabled={!district || applying}
              onPress={() => void retryApply()}
            />
          </VStack>
        ) : null}

        <VStack className="gap-2">
          {checkMessage ? (
            <Text className="type-caption text-center text-muted-foreground">{checkMessage}</Text>
          ) : null}
          <AppButton
            label={checking ? t("accountStatus.checkBusy") : t("accountStatus.checkStatus")}
            variant="outline"
            disabled={checking}
            onPress={() => void checkStatus()}
          />
          <AppButton
            label={t("accountStatus.goHome")}
            variant="outline"
            onPress={() => void auth.signOut()}
          />
        </VStack>
      </ScrollView>
    </View>
  );
}
