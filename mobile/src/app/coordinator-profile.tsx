/**
 * Coordinator profile — who is signed in, and the way out. Pushed from Region's header avatar,
 * not a tab (Figma node 428:6 draws it with a back arrow, unlike the four tab-root screens).
 *
 * Figma also shows Notification preferences, My documents and Help & support rows — nothing
 * backs any of them yet, so they are not here; see `.plans/coordination/OPEN.md`. Rows are plain
 * text, not icon rows, matching the one existing profile screen's style
 * (`(tabs)/profile.tsx`) rather than inventing an icon set for six rows.
 */

import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { RequestView } from "@/components/app/request-view";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function CoordinatorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const dashboard = useRequest(() => coordinationApi.dashboard(auth.token ?? ""), auth.token ?? "");

  if (auth.status !== "signed-in") return null;
  const { user } = auth;

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Profile" onBack={() => router.back()} />

      <VStack className="flex-1 gap-3 px-gutter pt-4">
        <HStack className="elevation-card items-center gap-3 rounded-card bg-card p-4">
          <Box className="h-13 w-13 items-center justify-center rounded-pill bg-secondary">
            <Text className="type-h4 text-secondary-foreground">
              {user.displayName.trim().charAt(0).toUpperCase()}
            </Text>
          </Box>
          <VStack className="flex-1 gap-0.5">
            <Text className="type-h4 text-foreground">{user.displayName}</Text>
            <Text className="type-caption text-muted-foreground">Area coordinator</Text>
          </VStack>
        </HStack>

        <RequestView request={dashboard}>
          {(data) => <Row label="Region" value={data.cooperative.district} />}
        </RequestView>

        <Row label="Contact number" value={user.phone} />
      </VStack>

      <View className="px-gutter" style={{ paddingBottom: Math.max(insets.bottom, 23) }}>
        <AppButton label="Log out" variant="outline" onPress={() => void auth.signOut()} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <HStack className="min-h-tap items-center justify-between rounded-card border border-border bg-card px-4 py-3.5">
      <Text className="type-body text-foreground">{label}</Text>
      <Text className="type-body text-muted-foreground">{value}</Text>
    </HStack>
  );
}
