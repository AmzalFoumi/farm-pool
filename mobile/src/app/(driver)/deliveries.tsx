/**
 * Deliveries — everything this driver has already carried.
 *
 * Reached from the profile rather than the Jobs tab. A delivered load answers nothing about what
 * the driver is doing now, and leaving it in the live list pushed today's work down the screen
 * behind a history that only grows. It is a record, so it sits with the record.
 *
 * Newest first, because the question someone asks of a history is almost always about the recent
 * end of it — "what did I carry yesterday", not "what did I carry in March".
 */

import { cropById } from "@farm-pool/shared";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { CropTile } from "@/features/listings/crop-tile";
import { logisticsApi } from "@/features/logistics/api";
import { formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function DeliveriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const history = useRequest(() => logisticsApi.history(token ?? ""), token ?? "");

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("deliveries.title")} onBack={() => router.back()} />
      <RequestView request={history}>
        {(jobs) => (
          <FlatList
            data={jobs}
            keyExtractor={(job) => job.id}
            contentContainerClassName="gap-3 p-gutter"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => {
              const crop = cropById(item.cropId);
              const place = item.town ? `${item.town}, ${item.district}` : item.district;
              /* The ordered quantity. What was actually collected lives on the job detail rather
                 than the summary, and a record showing the agreed figure is still true — the
                 difference is on the job itself, one tap away. */
              const carried = item.quantityKg;
              return (
                <HStack className="elevation-card min-h-tap items-center gap-3 rounded-card border border-border bg-card p-3">
                  <CropTile emoji={crop.emoji} />
                  <VStack className="flex-1 gap-0.5">
                    <Text className="type-body-bold text-foreground" numberOfLines={1}>
                      {carried} kg · {t(cropLabelKey(crop.id))}
                    </Text>
                    <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                      {item.farmerName} · {place}
                    </Text>
                  </VStack>
                  <Text className="type-body-bold text-foreground">{formatPrice(item.total)}</Text>
                </HStack>
              );
            }}
            ListEmptyComponent={
              <EmptyNote title={t("deliveries.emptyTitle")} note={t("deliveries.emptyBody")} />
            }
          />
        )}
      </RequestView>
    </View>
  );
}
