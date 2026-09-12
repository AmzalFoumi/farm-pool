import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "@/global.css";

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GluestackUIProvider mode={colorScheme === "dark" ? "dark" : "light"}>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <AppTabs />
          </ThemeProvider>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
