import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackIcon } from "@/components/app/icons";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";

type AppBarProps = {
  /**
   * Omitted when the screen states its own name in the body — the log-in screen opens with
   * "Welcome back" at `type-h1`, and repeating it in the bar above would be the same words twice
   * in two sizes. The bar is then purely the way back.
   */
  title?: string;
  onBack?: () => void;
  /**
   * `"default"` is the bar the role picker in Figma draws and twenty-odd screens already use: a
   * ruled bottom edge, an outlined back button, title beside it.
   *
   * `"plain"` drops both rules and centres the title. It is for a screen whose content carries its
   * own edges — the role picker's cards sit on tinted fills, so a rule above them and an outline
   * around the back button are two more boxes on a screen that already has four.
   *
   * **Opt-in on purpose.** This component is shared by every onboarding and detail screen in the
   * app, several of them owned by other people. Changing the default here would restyle all of
   * them from one screen's design review, so the variant is passed by the screen that wants it.
   */
  variant?: "default" | "plain";
};

/**
 * The onboarding app bar: a 48dp back button and a Poppins title, as the role picker
 * (Figma 196:5575) draws it. Shared by the sign-up and log-in screens so the three read as one
 * flow. Headers are off in the root stack precisely because this bar cannot be expressed as a
 * native header.
 */
export function AppBar({ title, onBack, variant = "default" }: AppBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plain = variant === "plain";

  return (
    <HStack
      className={`items-center gap-3 bg-card px-4 pb-4 ${plain ? "" : "border-b border-border"}`}
      style={{ paddingTop: insets.top + 16 }}
    >
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        className={`h-tap w-tap items-center justify-center rounded-pill ${
          plain ? "" : "border border-border"
        }`}
      >
        <BackIcon />
      </Pressable>

      {/* Centred means centred on the screen, not on what is left of it, so the title takes the
          remaining width and is balanced by a box the size of the back button. Without the spacer
          the title sits 48dp right of centre and reads as a near miss rather than a choice. */}
      {title ? (
        <Text className={`type-title text-foreground ${plain ? "flex-1 text-center" : ""}`}>
          {title}
        </Text>
      ) : (
        <Box className="flex-1" />
      )}
      {plain && title ? <Box className="h-tap w-tap" /> : null}
    </HStack>
  );
}
