import { cropById, type CropPriceContext, type Listing } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon, InfoIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { compareToBenchmark } from "@/features/coordination/benchmark-comparison";
import { formatPrice } from "@/lib/format";
import type { useRequest } from "@/lib/use-request";

/**
 * Pending listings priced outside the benchmark the coordinator published for that crop — the
 * queue that actually matters, since the coordinator's rule is not to approve a listing priced
 * outside the range they set (confirmed directly, not inferred). Scoped to `pending_approval`
 * only: an already-`verified` listing's price is a decision already made, not a pending one.
 *
 * Renders nothing at all — not even a loading spinner or an "all clear" message — unless there is
 * a real outlier to show. The common case is nothing to flag, and a card that is usually empty
 * just to say so is exactly the dead space Region was trying to get rid of; the Farmer Spotlight
 * now takes the prominent slot this used to sit in, and this only resurfaces when it matters.
 */
export function PriceOutlierAlert({
  listings,
  benchmarks
}: {
  listings: ReturnType<typeof useRequest<Listing[]>>;
  benchmarks: ReturnType<typeof useRequest<CropPriceContext[]>>;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  if (listings.status !== "ready" || benchmarks.status !== "ready") return null;

  const outliers = listings.data
    .filter((listing) => listing.status === "pending_approval")
    .map((listing) => ({
      listing,
      comparison: compareToBenchmark(
        cropById(listing.cropId).name,
        listing.pricePerKg,
        benchmarks.data.find((c) => c.cropId === listing.cropId)
      )
    }))
    .filter((row) => row.comparison.outsideRange);

  if (outliers.length === 0) return null;

  return (
    <VStack className="mx-gutter gap-3 rounded-card border border-border bg-card p-4">
      <HStack className="items-center gap-2">
        <Icon as={InfoIcon} className="text-muted-foreground" size="sm" />
        <Text className="type-h4 text-foreground">Priced outside benchmark</Text>
      </HStack>
      {outliers.map(({ listing, comparison }) => {
        const crop = cropById(listing.cropId);
        /* Written out in full, not interpolated — UniWind needs every class name visible at
         *  build time (same rule `status-pill.tsx`'s tone table follows). */
        const badgeClass =
          comparison.tone === "warning"
            ? "rounded-pill bg-warning-subtle px-3 py-1"
            : "rounded-pill bg-info-subtle px-3 py-1";
        const badgeTextClass =
          comparison.tone === "warning"
            ? "type-body-sm-bold text-warning"
            : "type-body-sm-bold text-info";
        return (
          <Pressable
            key={listing.id}
            onPress={() => router.push(`/listing-review/${listing.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Review ${t(cropLabelKey(crop.id))} listing from ${listing.farmerName} — ${comparison.message}`}
            className="min-h-tap flex-row items-center justify-between"
          >
            <VStack className="flex-1 gap-0.5">
              <Text className="type-body-bold text-foreground" numberOfLines={1}>
                {`${t(cropLabelKey(crop.id))} · ${formatPrice(listing.pricePerKg)}/kg`}
              </Text>
              <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                {`${listing.farmerName} · ${comparison.message}`}
              </Text>
            </VStack>
            <Box className={badgeClass}>
              <Text className={badgeTextClass}>{t("common.review")}</Text>
            </Box>
          </Pressable>
        );
      })}
    </VStack>
  );
}
