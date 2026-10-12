/** The responses farmers have sent to one of this buyer's requests (FARM-47). */

import { cropById, type Offer, type WantedListing } from "@farm-pool/shared";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { offersApi } from "@/features/offers/api";
import { OfferStatusPill, WantedStatusPill } from "@/features/orders/status-pill";
import { wantedApi } from "@/features/wanted/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Loaded = { request: WantedListing; responses: Offer[] };

export default function WantedResponsesScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const loaded = useRequest<Loaded>(async () => {
    const [mine, responses] = await Promise.all([
      wantedApi.mine(token ?? ""),
      offersApi.forWanted(token ?? "", id)
    ]);
    const request = mine.find((w) => w.id === id);
    if (!request) throw new ApiError(404, "wanted_not_found", "This request was not found.");
    /* Once a request is closed its unanswered responses can no longer be accepted (the api
       answers `wanted_closed`), so only the ones that reached an end are worth showing. */
    const shown =
      request.status === "open"
        ? responses
        : responses.filter((o) => o.status !== "PENDING" && o.status !== "NEGOTIATING");
    return { request, responses: shown };
  }, `${token}|${id}`);

  useFocusEffect(useReloadOnRefocus(loaded.reload));

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Responses" />
      <RequestView request={loaded}>
        {({ request, responses }) => {
          const crop = cropById(request.cropId);
          return (
            <FlatList
              data={responses}
              keyExtractor={(o) => o.id}
              contentContainerClassName="gap-3 p-gutter"
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              ListHeaderComponent={
                <HStack className="items-center gap-3 rounded-card border border-border bg-card p-4">
                  <VStack className="flex-1 gap-0.5">
                    <Text className="type-h4 text-foreground">
                      {crop.name} · {request.quantityKg} kg
                    </Text>
                    <Text className="type-caption text-muted-foreground">
                      By {formatDate(request.neededBy)} · {request.district}
                    </Text>
                  </VStack>
                  <WantedStatusPill status={request.status} />
                </HStack>
              }
              renderItem={({ item }) => {
                const live = item.status === "PENDING" || item.status === "NEGOTIATING";
                const yourTurn = live && item.actionRequiredBy === "BUYER";
                const farmer = item.farmerName ?? "Farmer";
                return (
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/my-offers/[id]", params: { id: item.id } })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${farmer} offers ${item.quantityKg} kilos at ${item.pricePerKg} rupees per kilo`}
                    className="elevation-card min-h-tap flex-row items-center gap-3 rounded-card border border-border bg-card p-3"
                  >
                    <VStack className="flex-1 gap-0.5">
                      <Text className="type-body-bold text-foreground" numberOfLines={1}>
                        {farmer}
                      </Text>
                      <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                        {item.quantityKg} kg at {formatPrice(item.pricePerKg)}/kg ·{" "}
                        {formatPrice(item.total)}
                      </Text>
                      {yourTurn ? (
                        <Text className="type-body-sm-bold text-warning">Your turn to answer</Text>
                      ) : null}
                    </VStack>
                    <OfferStatusPill status={item.status} />
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <EmptyNote
                  title={request.status === "open" ? "No responses yet" : "Request closed"}
                  note={
                    request.status === "open"
                      ? "Farmers who can supply this will answer with their price. Check back soon."
                      : "This request is closed, so farmers can no longer answer it."
                  }
                />
              }
            />
          );
        }}
      </RequestView>
    </View>
  );
}
