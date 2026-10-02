import DriverTabs from "@/components/driver-tabs";

/** The delivery partner tab shell — parallel to `(tabs)`, `(farmer)/(tabs)` and
 *  `(coordinator-tabs)`. Which one a signed-in user sees is decided in the root layout, by role. */
export default function DriverTabsLayout() {
  return <DriverTabs />;
}
