import { Mulish_400Regular, Mulish_700Bold } from "@expo-google-fonts/mulish";
import { Poppins_700Bold } from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  /* The design system's three faces. The keys are the family names the
     `type-*` utilities in `src/styles/typography.css` resolve to — rename one
     here and every heading in the app silently falls back to the system font.
     Only the cuts the Figma type scale actually uses are loaded; each extra
     face is ~40 KB in the bundle for users often on a rural 3G connection. */
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Mulish_400Regular,
    Mulish_700Bold
  });

  /* Render nothing until the faces are in. Text laid out in the system font
     and then reflowed into Poppins/Mulish is a visible jump on a cold start,
     and the splash screen is already covering this moment anyway. */
  if (!fontsLoaded) return null;

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode={colorScheme === "dark" ? "dark" : "light"}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            {/* Onboarding is the root stack, so `index` (the welcome screen) is
                what a cold start lands on. The tab shell lives one level in, at
                `(tabs)`, and is reached by replacing the route once a role has
                been picked — replace, not push, so the hardware back button
                does not walk the user back into sign-up.

                Headers are off throughout: both onboarding screens draw their
                own app bar, which is the only way to match the design's
                50px bordered back button and Poppins title. */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="sign-up-as" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </ThemeProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
