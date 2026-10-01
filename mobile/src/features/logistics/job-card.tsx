import { cropById, type JobSummary } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { CropTile } from "@/features/listings/crop-tile";
import { OrderStatusPill } from "@/features/orders/status-pill";
import { formatPrice } from "@/lib/format";

/**
 * One row on the job board or on a driver's own job list.
 *
 * Load and place lead, because that is what a driver decides on — the crop and the money are
 * secondary to whether this trip is worth the diesel. The whole row is the tap target, not the
 * chevron, per CLAUDE.md rule 4: a driver taps this in a vehicle, one-handed.
 */
export function JobCard({ job, onPress }: { job: JobSummary; onPress: () => void }) {
  const { t } = useTranslation();
  const crop = cropById(job.cropId);
  const place = job.town ? `${job.town}, ${job.district}` : job.district;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("jobs.cardLabel", {
        count: job.quantityKg,
        crop: crop.name,
        place,
        total: formatPrice(job.total)
      })}
      className="elevation-card min-h-tap flex-row items-center gap-3 rounded-card border border-border bg-card p-3"
    >
      <CropTile emoji={crop.emoji} />
      <VStack className="flex-1 gap-0.5">
        <Text className="type-body-bold text-foreground" numberOfLines={1}>
          {job.quantityKg} kg · {crop.name}
        </Text>
        <Text className="type-caption text-muted-foreground" numberOfLines={1}>
          {place} · {formatPrice(job.total)}
        </Text>
      </VStack>
      <VStack className="items-end gap-1">
        <OrderStatusPill status={job.status} />
        {job.fulfillmentOption === "shared" ? (
          <Box className="rounded-pill bg-muted px-2 py-0.5">
            <Text className="type-body-sm text-muted-foreground">{t("jobs.shared")}</Text>
          </Box>
        ) : null}
      </VStack>
    </Pressable>
  );
}
