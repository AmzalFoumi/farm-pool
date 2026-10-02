import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app/app-button";
import { Text } from "@/components/ui/text";
import { DriverIdentityCard } from "@/features/driver/components/profile/driver-identity-card";
import { VehicleCard } from "@/features/driver/components/profile/vehicle-card";
import { useAuth } from "@/providers/auth-provider";

/**
 * The delivery partner's profile (FARM-45, LP-06): who they are, the vehicle farmers will see,
 * and where its check stands (LP-03). Rating (LP-80) arrives with the ratings story.
 */
export default function DriverProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

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
      <View className="border-b border-border bg-card px-gutter py-3.5">
        <Text className="type-caption-bold uppercase text-muted-foreground">Account & vehicle</Text>
        <Text className="type-title text-foreground">Profile</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-gutter pb-12 pt-4">
        <DriverIdentityCard name={user.displayName} phone={user.phone} />

        {user.driver ? (
          <VehicleCard driver={user.driver} onEdit={() => router.push("/driver-vehicle")} />
        ) : null}

        <AppButton
          label={signingOut ? "Logging out…" : "Log out"}
          variant="outline"
          disabled={signingOut}
          onPress={handleSignOut}
        />
      </ScrollView>
    </View>
  );
}
