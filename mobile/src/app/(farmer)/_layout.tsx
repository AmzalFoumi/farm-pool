import { Stack } from "expo-router";

export default function FarmerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-listing/create" />
    </Stack>
  );
}
