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
import { AuthProvider, useAuth } from "@/providers/auth-provider";

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
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}

/** Split out so it can read the auth state the provider above owns. */
function RootNavigator() {
  const auth = useAuth();

  /* Same reasoning as the fonts: while the saved session is being checked
     against the api, the native splash stays up rather than flashing the
     welcome screen at someone who is about to land on /home. This never
     hangs — see `auth-provider.tsx`. */
  if (auth.status === "loading") return null;
  const signedIn = auth.status === "signed-in";
  const isFarmer = signedIn && auth.user?.role === "farmer";

  return (
    <>
      <AnimatedSplashOverlay />
      {/* Onboarding is the root stack, so `index` (the welcome screen) is
          what a cold start lands on when nobody is signed in. The tab shell
          lives one level in, at `(tabs)` or `(farmer)`.

          `Stack.Protected` does the routing an auth check used to need
          `router.replace` for: with `signedIn` false the app screens are not
          reachable (a deep link falls back to `index`); when it flips to true
          the onboarding screens are removed from history, so Android's back
          button cannot walk a signed-in user back into sign-up. Signing out
          flips it the other way and the shell unmounts.

          Headers are off throughout: every screen draws its own app bar,
          which is the only way to match the design's bordered back button
          and Poppins title. */}
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName={signedIn ? (isFarmer ? "(farmer)" : "(tabs)") : "index"}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-up-as" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="log-in" />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(farmer)" />
          <Stack.Screen name="(tabs)" />
          {/* Listing detail sits in the root stack, not in `(tabs)`: the
              design gives it no tab bar, and it is pushed over the shell. */}
          <Stack.Screen name="listing/[id]" />
          {/* Orders and crop requests are reached from Home cards, not tabs,
              until the tab set is settled per role. */}
          <Stack.Screen name="orders/index" />
          <Stack.Screen name="orders/[id]" />
          <Stack.Screen name="wanted/index" />
          <Stack.Screen name="wanted/new" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
