import { can } from "@farm-pool/shared";
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
import { FONT_ASSETS } from "@/lib/i18n/fonts";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  /* Six faces: regular and bold in Latin, Sinhala and Tamil (LP-91). The keys are the family
     names `src/styles/typography.css` and `lib/i18n/fonts.ts` resolve to — rename one here and
     every heading in the app silently falls back to the system font.

     All six load at startup rather than on language change, because `expo-font` registers a
     family once and re-registering the same name with a different file is not supported. They
     are subset to the three scripts this app renders (607 KB in total, from 1,860 KB upstream),
     which is what makes loading all of them affordable on a rural 3G connection. */
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  /* Render nothing until the faces are in. Text laid out in the system font and then reflowed
     into Noto is a visible jump on a cold start, and the splash screen is already covering this
     moment anyway. */
  if (!fontsLoaded) return null;

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode={colorScheme === "dark" ? "dark" : "light"}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            {/* Outside AuthProvider: the language is chosen on the welcome screen, before
                anyone has an account, and must survive signing out. */}
            <LocaleProvider>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </LocaleProvider>
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
  const isCoordinator = signedIn && can(auth.user.role, "cooperative:read-dashboard");
  const isFarmer = signedIn && can(auth.user.role, "listing:create");
  const isDriver = signedIn && can(auth.user.role, "delivery:accept");

  return (
    <>
      <AnimatedSplashOverlay />
      {/* Onboarding is the root stack, so `index` (the welcome screen) is
          what a cold start lands on when nobody is signed in. The tab shell
          lives one level in — `(farmer)` for a farmer (FARM-21),
          `(coordinator-tabs)` for a coordinator (FARM-25), `(driver)` for a
          delivery partner (FARM-45), `(tabs)` for everyone else; which one a signed-in user gets is decided here, once,
          by which group's guard is open, rather than duplicated per screen.

          `Stack.Protected` does the routing an auth check used to need
          `router.replace` for: with `signedIn` false the app screens are not
          reachable (a deep link falls back to `index`); when it flips to true
          the onboarding screens are removed from history, so Android's back
          button cannot walk a signed-in user back into sign-up. Signing out
          flips it the other way and the shell unmounts.

          Headers are off throughout: every screen draws its own app bar or
          hero header, which is the only way to match the design. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-up-as" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="log-in" />
        </Stack.Protected>

        {/* The tab shells must be declared before `listing/[id]` below: a Stack
            navigator's default initial route is whichever screen is registered
            first, and `listing/[id]` has no `id` without a real navigation into
            it — declaring it first makes the app try to open it blank on cold
            start (FARM-25 regression, caught 2026-09-19). */}
        <Stack.Protected guard={signedIn && !isCoordinator && !isFarmer && !isDriver}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>

        {/* A driver with no vehicle yet lands on the vehicle wizard, not the
            tabs; `(driver)/_layout.tsx` decides which. */}
        <Stack.Protected guard={isDriver}>
          <Stack.Screen name="(driver)" />
        </Stack.Protected>

        <Stack.Protected guard={isFarmer}>
          <Stack.Screen name="(farmer)" />
          <Stack.Screen name="call-requests" />
        </Stack.Protected>

        <Stack.Protected guard={isCoordinator}>
          <Stack.Screen name="(coordinator-tabs)" />
          {/* Pushed from Region's header avatar, not a tab — Figma draws it with a back
              arrow, unlike the four tab-root screens. */}
          <Stack.Screen name="coordinator-profile" />
          {/* Pushed from a Daily Benchmark row or a "Needs you today" benchmark task
              (FARM-37) — same reasoning as `coordinator-profile` above. */}
          <Stack.Screen name="benchmark/[cropId]" />
        </Stack.Protected>

        {/* Orders and crop requests are reached from Home cards, not tabs,
            until the tab set is settled per role. A farmer needs them too
            (`order:read-own` and `wanted:read` are open to every role), so they
            sit outside the buyer shell's group. */}
        <Stack.Protected guard={signedIn && !isCoordinator}>
          <Stack.Screen name="orders/index" />
          <Stack.Screen name="orders/[id]" />
          <Stack.Screen name="receipt/[orderId]" />
          <Stack.Screen name="wanted/index" />
          <Stack.Screen name="wanted/new" />
        </Stack.Protected>

        {/* Common ground between the shells: a listing detail is reached
            from a buyer's browse screen and from a coordinator's Region
            screen alike, so it sits outside every role's protected group
            rather than being registered twice. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="listing/[id]" />
          {/* A call is between a buyer and a farmer, whose shells differ. */}
          <Stack.Screen name="call/[id]" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
