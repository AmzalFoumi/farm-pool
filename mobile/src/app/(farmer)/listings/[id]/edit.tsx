import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
import { useRequest } from "@/lib/use-request";
import { listingsApi } from "@/features/listings/api";
import { useAuth } from "@/providers/auth-provider";
import { CreateListingScreen } from "@/features/listings/create-listing-screen";

export default function EditListingRoute() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const req = useRequest(async () => {
    const all = await listingsApi.mine(token ?? "");
    const found = all.find((l) => l.id === id);
    if (!found) throw new Error("Listing not found");
    return found;
  }, `${token}|edit|${id}`);

  if (req.status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading listing data...</Text>
      </View>
    );
  }

  if (req.status === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-destructive text-center mb-4">
          Failed to load listing for editing.
        </Text>
      </View>
    );
  }

  // Once ready, we render the exact same wizard, but in edit mode!
  return <CreateListingScreen initialData={req.data} />;
}
