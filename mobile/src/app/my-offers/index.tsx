/** My offers — every price negotiation the signed-in user is part of, newest first. */

import { cropById } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { CropTile } from "@/features/listings/crop-tile";
import { offersApi } from "@/features/offers/api";
import { viewerOf } from "@/features/offers/to-ui-offer";
import { OfferStatusPill } from "@/features/orders/status-pill";
import { formatPrice } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function MyOffersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const offers = useRequest(() => offersApi.mine(token ?? ""), token ?? "");

  // Coming back from an offer (after a counter or an accept) shows its new state.
  useFocusEffect(useReloadOnRefocus(offers.reload));

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("offers.mine.title")} />
      <RequestView request={offers}>
        {(rows) => (
          <FlatList
            data={rows}
            keyExtractor={(o) => o.id}
            contentContainerClassName="gap-3 p-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const crop = cropById(item.cropId);
              const viewer = viewerOf(item, user?.id ?? "");
              const other =
                (viewer === "FARMER" ? item.buyerName : item.farmerName) ??
                (viewer === "FARMER" ? t("party.buyer") : t("party.farmer"));
              const live = item.status === "PENDING" || item.status === "NEGOTIATING";
              const yourTurn = live && item.actionRequiredBy === viewer;
              return (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/my-offers/[id]", params: { id: item.id } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${t(cropLabelKey(crop.id))}, ${item.quantityKg} kilos, with ${other}`}
                  className="elevation-card min-h-tap flex-row items-center gap-3 rounded-card border border-border bg-card p-3"
                >
                  <CropTile emoji={crop.emoji} />
                  <VStack className="flex-1 gap-0.5">
                    <Text className="type-body-bold text-foreground" numberOfLines={1}>
                      {t(cropLabelKey(crop.id))} · {item.quantityKg} kg
                    </Text>
                    <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                      {other} · {formatPrice(item.pricePerKg)}/kg
                    </Text>
                    {yourTurn ? (
                      <Text className="type-body-sm-bold text-warning">
                        {t("offers.mine.yourTurn")}
                      </Text>
                    ) : null}
                  </VStack>
                  <OfferStatusPill status={item.status} />
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <EmptyNote title={t("offers.mine.noneYet")} note={t("offers.mine.noneYetBody")} />
            }
          />
        )}
      </RequestView>
    </View>
  );
}
