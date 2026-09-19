import AppTabs from "@/components/app-tabs";
import { useAuth } from "@/providers/auth-provider";
import { Redirect } from "expo-router";

/** The tab shell. Reached after onboarding, not on cold start — the root stack
 *  opens on the welcome screen (`src/app/index.tsx`). */
export default function TabsLayout() {
  const auth = useAuth();

  if (auth.status === "signed-in" && auth.user?.role === "farmer") {
    return <Redirect href="/(farmer)/(tabs)/farmer-home" />;
  }

  return <AppTabs />;
}
