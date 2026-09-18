import type { Role } from "@farm-pool/shared";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/providers/auth-provider";

const ROLE_LABEL: Record<Role, string> = {
  farmer: "Farmer",
  buyer: "Wholesale buyer",
  coordinator: "Area coordinator",
  logistics: "Delivery partner"
};

/**
 * Profile — who is signed in, and the way out.
 *
 * Deliberately minimal: the role-specific profile (a farmer's farm, a buyer's
 * business) belongs to the developer owning that role. What every role needs
 * is here — name, number, role, and a log-out that returns to Welcome. Signing
 * out clears the device token only; the api has no session to end.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  // Unreachable while signed out: the tab shell sits behind the root guard.
  if (auth.status !== "signed-in") return null;
  const { user } = auth;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <VStack className="flex-1 gap-4 px-gutter pt-4">
        <Text className="type-h2 text-foreground">Profile</Text>

        <HStack className="elevation-card items-center gap-3 rounded-card bg-card p-4">
          <Box className="h-13 w-13 items-center justify-center rounded-pill bg-secondary">
            <Text className="type-h4 text-secondary-foreground">
              {user.displayName.trim().charAt(0).toUpperCase()}
            </Text>
          </Box>
          <VStack className="flex-1 gap-0.5">
            <Text className="type-h4 text-foreground">{user.displayName}</Text>
            <Text className="type-caption text-muted-foreground">{user.phone}</Text>
          </VStack>
          <Box className="rounded-pill bg-secondary px-3 py-1">
            <Text className="type-body-sm-bold text-secondary-foreground">
              {ROLE_LABEL[user.role]}
            </Text>
          </Box>
        </HStack>

        <Text className="type-body text-muted-foreground">
          Your business details, saved contacts and order history will appear here.
        </Text>
      </VStack>

      <View className="px-gutter" style={{ paddingBottom: Math.max(insets.bottom, 23) }}>
        <AppButton label="Log out" variant="outline" onPress={() => void auth.signOut()} />
      </View>
    </View>
  );
}
