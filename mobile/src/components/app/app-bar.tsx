import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "@/components/app/icons";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

/**
 * The onboarding app bar: a bordered 48dp back button and a Poppins title,
 * as the role picker (Figma 196:5575) draws it. Shared by the sign-up and
 * log-in screens so the three read as one flow. Headers are off in the root
 * stack precisely because this bar cannot be expressed as a native header.
 */
export function AppBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <HStack
      className="items-center gap-3 border-b border-border bg-card px-4 pb-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="h-tap w-tap items-center justify-center rounded-pill border border-border"
      >
        <BackIcon />
      </Pressable>
      <Text className="type-title text-foreground">{title}</Text>
    </HStack>
  );
}
