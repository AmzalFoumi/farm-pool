/** Buyer requests — the crops buyers are asking for right now, for a farmer to answer. */

import { cropById } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { wantedApi } from "@/features/wanted/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function BuyerRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const requests = useRequest(() => wantedApi.open(token ?? ""), token ?? "");

  useFocusEffect(useReloadOnRefocus(requests.reload));

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Buyer requests" />
      <RequestView request={requests}>
        {(rows) => (
          <FlatList
            data={rows}
            keyExtractor={(w) => w.id}
            contentContainerClassName="gap-3 p-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const crop = cropById(item.cropId);
              return (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/requests/[id]", params: { id: item.id } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${crop.name}, ${item.quantityKg} kilos wanted in ${item.district}`}
                  className="elevation-card min-h-tap flex-row items-center gap-3 rounded-card border border-border bg-card p-3"
                >
                  <CropTile emoji={crop.emoji} />
                  <VStack className="flex-1 gap-0.5">
                    <Text className="type-body-bold text-foreground" numberOfLines={1}>
                      {crop.name} · {item.quantityKg} kg
                    </Text>
                    <Text className="type-caption text-muted-foreground" numberOfLines={2}>
                      By {formatDate(item.neededBy)} · {item.district}
                      {item.maxPricePerKg ? ` · up to ${formatPrice(item.maxPricePerKg)}/kg` : ""}
                    </Text>
                  </VStack>
                  <Text className="type-body-sm-bold text-primary">Respond</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <EmptyNote
                title="No requests right now"
                note="When a buyer asks for a crop, it shows here and you can answer with your price."
              />
            }
          />
        )}
      </RequestView>
    </View>
  );
}
