import AppTabs from "@/components/app-tabs";

/** The tab shell. Reached after onboarding, not on cold start — the root stack
 *  opens on the welcome screen (`src/app/index.tsx`). */
export default function TabsLayout() {
  return <AppTabs />;
}
