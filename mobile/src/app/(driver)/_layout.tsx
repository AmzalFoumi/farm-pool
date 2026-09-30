import { Stack } from "expo-router";

import { useAuth } from "@/providers/auth-provider";

/**
 * The delivery partner's group (FARM-45).
 *
 * A driver with no vehicle on file cannot reach the tabs: the guard is closed, so the only screen
 * left is the vehicle wizard and that is where they land (LP-10 — an empty job board would be a
 * dead end). Once the api returns a `driver` object the guard opens; the wizard then moves them
 * on itself, because `Stack.Protected` removes screens when a guard closes but does not navigate
 * when one opens.
 *
 * `(tabs)` is declared first so it is the initial route whenever it is reachable.
 */
export default function DriverLayout() {
  const auth = useAuth();
  const hasVehicle = auth.status === "signed-in" && auth.user.driver !== undefined;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasVehicle}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Screen name="driver-vehicle" />
    </Stack>
  );
}
