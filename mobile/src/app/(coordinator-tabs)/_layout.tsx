import CoordinatorTabs from "@/components/coordinator-tabs";

/** The coordinator tab shell — parallel to `(tabs)`, not nested in it. Which one a signed-in
 *  user sees is decided in the root layout, by role. */
export default function CoordinatorTabsLayout() {
  return <CoordinatorTabs />;
}
