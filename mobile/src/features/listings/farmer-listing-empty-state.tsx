import { View } from "react-native";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { AppButton } from "@/components/app/app-button";
import { PlusIcon } from "@/components/app/icons";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

const EMPTY_PAUSED_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>`;

interface FarmerListingEmptyStateProps {
  filter: "active" | "paused" | "drafts" | "sold";
}

export function FarmerListingEmptyState({ filter }: FarmerListingEmptyStateProps) {
  const router = useRouter();

  if (filter === "paused") {
    return (
      <Card className="items-center justify-center py-12 px-6 bg-card border-border mt-2">
        <View className="w-14 h-14 mb-3 rounded-full bg-success-subtle items-center justify-center">
          <View className="text-success">
            <SvgXml xml={EMPTY_PAUSED_ICON} width={28} height={28} color="currentColor" />
          </View>
        </View>
        <Text className="type-body-lg-bold text-foreground mb-1">No paused listings</Text>
        <Text className="type-body-sm text-muted-foreground text-center">
          All your crops are active or sold in the marketplace!
        </Text>
      </Card>
    );
  }

  return (
    <Card className="items-center justify-center py-10 px-4 bg-card border-border mt-2">
      <Text className="type-body-bold text-foreground">No listings found</Text>
      <Text className="type-body text-muted-foreground text-center mt-1 mb-4">
        You have not posted any produce batches under this tab yet.
      </Text>
      <AppButton
        label="Create listing"
        icon={<PlusIcon />}
        onPress={() => router.push("/(farmer)/create-listing/create")}
      />
    </Card>
  );
}
