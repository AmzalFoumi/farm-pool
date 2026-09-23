import { useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BellIcon, Icon } from "@/components/ui/icon";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAuth } from "@/providers/auth-provider";

/**
 * The hero header shared by all four coordinator tabs. One component so "consistent across
 * every screen" is structural, not something to keep in sync by hand across four files.
 *
 * Search was dropped (2026-09-19) — three icons read as clutter, and search has nothing behind
 * it yet anyway. Bell stays present but inert, same treatment as "Request call" on the listing
 * detail screen; avatar is the one real action, opening Profile.
 */
export function CoordinatorHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initial = user?.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <HStack
      className="items-center justify-between rounded-b-sheet bg-brand-deep px-gutter pb-5"
      style={{ paddingTop: insets.top + 16 }}
    >
      <VStack className="gap-1">
        <Text className="type-h3 text-brand-deep-foreground">{title}</Text>
        {subtitle ? <Text className="type-caption text-brand-deep-muted">{subtitle}</Text> : null}
      </VStack>

      <HStack className="gap-2">
        <View className="h-11 w-11 items-center justify-center rounded-pill bg-card">
          <Icon as={BellIcon} className="h-5 w-5 text-brand-deep" />
        </View>
        <Pressable
          onPress={() => router.push("/coordinator-profile")}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          className="h-11 w-11 items-center justify-center rounded-pill bg-card"
        >
          <Text className="type-h4 text-brand-deep">{initial}</Text>
        </Pressable>
      </HStack>
    </HStack>
  );
}
