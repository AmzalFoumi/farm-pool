import FarmerTabs from "@/components/farmer-tabs";

/** The farmer tab shell — parallel to `(tabs)` and `(coordinator-tabs)`. Which one a signed-in
 *  user sees is decided in the root layout, by role. */
export default function FarmerTabsLayout() {
  return <FarmerTabs />;
}
