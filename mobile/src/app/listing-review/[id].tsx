/**
 * Listing review (FARM-43) — everything the farmer uploaded, so the coordinator can actually
 * verify a submission before accepting or rejecting it, rather than deciding from crop name +
 * quantity + farmer name alone (which is all "Needs you today" ever showed). Reuses the
 * already-fetched Listings list rather than a dedicated endpoint — same reuse pattern
 * `farmer/[id].tsx` uses for the Farmers list, and Set Crop Price uses for its crop's context.
 *
 * Rejecting requires typing a reason: it is stored on the listing and shown back to the farmer
 * on their own listings screen — the reason the field is mandatory here, not optional.
 */

import {
  cropById,
  type CropPriceContext,
  type FulfillmentOption,
  type Listing,
  type ListingPackaging
} from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { coordinationApi } from "@/features/coordination/api";
import {
  compareToBenchmark,
  type BenchmarkComparison
} from "@/features/coordination/benchmark-comparison";
import { bumpListingsVersion } from "@/features/coordination/listings-version";
import { CropTile } from "@/features/listings/crop-tile";
import { ListingStatusPill } from "@/features/orders/status-pill";
import { ApiError } from "@/lib/api";
import { daysSince, formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

/* Same wording as the buyer's listing detail and the listing wizard's review step, so they share
   its keys. Key paths, not resolved strings: a module-level `t()` runs before i18next has a
   language and would never update when the user changes one. */
const packagingLabelKey = (p: ListingPackaging) => `listings.packagingShort.${p}` as const;

const fulfillmentLabelKey = (f: FulfillmentOption) =>
  f === "shared" ? "listings.step5.shared" : "listings.step5.solo";

export default function ListingReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const listings = useRequest(() => coordinationApi.listings(token ?? ""), token ?? "");
  const benchmarks = useRequest(() => coordinationApi.benchmarks(token ?? ""), token ?? "");

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("coordinator.review.title")} onBack={() => router.back()} />
      <RequestView request={listings}>
        {(rows) => {
          const listing = rows.find((l) => l.id === id);
          if (!listing) {
            return (
              <EmptyNote title={t("common.notFound")} note={t("coordinator.review.notFoundBody")} />
            );
          }
          return (
            <ListingReview
              listing={listing}
              token={token ?? ""}
              benchmarks={benchmarks}
              onDecided={() => {
                bumpListingsVersion();
                router.back();
              }}
            />
          );
        }}
      </RequestView>
    </View>
  );
}

function ListingReview({
  listing,
  token,
  benchmarks,
  onDecided
}: {
  listing: Listing;
  token: string;
  benchmarks: ReturnType<typeof useRequest<CropPriceContext[]>>;
  onDecided: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const crop = cropById(listing.cropId);
  const [reason, setReason] = useState("");
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const approve = async () => {
    setError(null);
    setDeciding("approve");
    try {
      await coordinationApi.approveListing(token, listing.id);
      onDecided();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("coordinator.review.approveError"));
    } finally {
      setDeciding(null);
    }
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setError(null);
    setDeciding("reject");
    try {
      await coordinationApi.rejectListing(token, listing.id, reason.trim());
      onDecided();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("coordinator.review.rejectError"));
    } finally {
      setDeciding(null);
    }
  };

  const photos = listing.photos ?? [];
  const place = listing.town ? `${listing.town}, ${listing.district}` : listing.district;

  const priceContext =
    benchmarks.status === "ready"
      ? benchmarks.data.find((c) => c.cropId === listing.cropId)
      : undefined;
  const comparison =
    benchmarks.status === "ready"
      ? compareToBenchmark(crop.name, listing.pricePerKg, priceContext)
      : null;

  /* The coordinator's own rule: don't approve a listing priced outside the benchmark they set.
   *  Not a hard block — Approve still works, but a confirmation step stands between the tap and
   *  the action, same shape as Reject's mandatory-reason step just below. */
  const onApprovePressed = () => {
    if (comparison?.outsideRange) setConfirmingApprove(true);
    else void approve();
  };

  const freshness =
    listing.expiryDays !== undefined
      ? listing.expiryDays - daysSince(`${listing.harvestDate}T00:00:00.000Z`)
      : null;

  const produceDetails = [
    listing.variety ? { label: t("coordinator.review.variety"), value: listing.variety } : null,
    listing.grade
      ? { label: t("coordinator.review.grade"), value: `Grade ${listing.grade}` }
      : null,
    listing.packaging
      ? { label: t("coordinator.review.packaging"), value: t(packagingLabelKey(listing.packaging)) }
      : null,
    listing.certifications?.length
      ? { label: t("coordinator.review.certifications"), value: listing.certifications.join(", ") }
      : null
  ].filter((row) => row !== null);

  return (
    <>
      <ScrollView
        contentContainerClassName="gap-4 p-gutter"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3"
          >
            {photos.map((uri, i) => (
              <Pressable
                key={uri}
                onPress={() => setZoomedPhoto(uri)}
                accessibilityRole="button"
                accessibilityLabel={`View ${t(cropLabelKey(crop.id))} photo ${i + 1} larger`}
              >
                <Image
                  source={{ uri }}
                  size="2xl"
                  className="rounded-card bg-muted"
                  alt={`${t(cropLabelKey(crop.id))} photo ${i + 1}`}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <CropTile emoji={crop.emoji} size="lg" />
        )}

        <VStack className="gap-3 rounded-card border border-border bg-card p-4">
          <HStack className="items-center justify-between">
            <Text className="type-h3 text-foreground" numberOfLines={1}>
              {t(cropLabelKey(crop.id))}
            </Text>
            <ListingStatusPill status={listing.status} />
          </HStack>
          <DetailRow label={t("coordinator.review.farmer")} value={listing.farmerName} />
          <DetailRow label={t("coordinator.review.quantity")} value={`${listing.quantityKg} kg`} />
          <DetailRow
            label={t("coordinator.review.unitPrice")}
            value={`${formatPrice(listing.pricePerKg)} / kg`}
          />
          <DetailRow
            label={t("coordinator.review.minimumOrder")}
            value={`${listing.minOrderKg} kg`}
          />
          <DetailRow
            label={t("coordinator.review.harvestDate")}
            value={formatDate(listing.harvestDate)}
          />
          {freshness !== null ? (
            <DetailRow
              label={t("coordinator.review.freshness")}
              value={
                freshness >= 0
                  ? `Fresh for ${freshness} more ${freshness === 1 ? "day" : "days"}`
                  : `Expired ${Math.abs(freshness)} ${Math.abs(freshness) === 1 ? "day" : "days"} ago`
              }
              tone={freshness < 0 ? "destructive" : freshness <= 1 ? "warning" : undefined}
            />
          ) : null}
        </VStack>

        <PriceBenchmarkCard status={benchmarks.status} comparison={comparison} />

        {produceDetails.length > 0 ? (
          <VStack className="gap-3 rounded-card border border-border bg-card p-4">
            <Text className="type-h4 text-foreground">
              {t("coordinator.review.produceDetails")}
            </Text>
            {produceDetails.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </VStack>
        ) : null}

        <VStack className="gap-3 rounded-card border border-border bg-card p-4">
          <Text className="type-h4 text-foreground">{t("coordinator.review.pickup")}</Text>
          <DetailRow label={t("coordinator.review.location")} value={place} />
          {listing.address ? (
            <DetailRow label={t("coordinator.review.address")} value={listing.address} />
          ) : null}
          <DetailRow
            label={t("coordinator.review.farmGatePin")}
            value={listing.pickupPoint ? t("coordinator.review.dropped") : t("common.notSet")}
          />
          {listing.fulfillmentOption ? (
            <DetailRow
              label={t("coordinator.review.transport")}
              value={t(fulfillmentLabelKey(listing.fulfillmentOption))}
            />
          ) : null}
          {listing.farmgateNotes ? (
            <Text className="type-body pt-1 text-foreground">{listing.farmgateNotes}</Text>
          ) : null}
        </VStack>

        {listing.status === "rejected" && listing.rejectionReason ? (
          <VStack className="gap-1 rounded-card border border-destructive bg-destructive-subtle p-4">
            <Text className="type-body-bold text-destructive">
              {t("coordinator.review.rejected")}
            </Text>
            <Text className="type-body text-destructive">{listing.rejectionReason}</Text>
          </VStack>
        ) : null}

        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

        {listing.status === "pending_approval" ? (
          confirmingReject ? (
            <VStack className="gap-3 rounded-card border border-border bg-card p-4">
              <AppTextField
                label={t("coordinator.review.reasonLabel")}
                value={reason}
                onChangeText={setReason}
                placeholder={t("coordinator.review.reasonPlaceholder")}
              />
              <HStack className="gap-2">
                <View className="flex-1">
                  <AppButton
                    label={t("common.cancel")}
                    variant="outline"
                    disabled={deciding !== null}
                    onPress={() => setConfirmingReject(false)}
                  />
                </View>
                <View className="flex-1">
                  <AppButton
                    label={
                      deciding === "reject" ? t("common.rejecting") : t("common.confirmReject")
                    }
                    disabled={deciding !== null || !reason.trim()}
                    onPress={() => void reject()}
                  />
                </View>
              </HStack>
            </VStack>
          ) : confirmingApprove && comparison ? (
            <VStack
              className={
                comparison.tone === "warning"
                  ? "gap-3 rounded-card border border-warning bg-warning-subtle p-4"
                  : "gap-3 rounded-card border border-info bg-info-subtle p-4"
              }
            >
              <Text
                className={
                  comparison.tone === "warning"
                    ? "type-body-bold text-warning"
                    : "type-body-bold text-info"
                }
              >
                {comparison.message}
              </Text>
              <Text
                className={
                  comparison.tone === "warning"
                    ? "type-caption text-warning"
                    : "type-caption text-info"
                }
              >
                {t("coordinator.review.approveAnywayTitle")}
              </Text>
              <HStack className="gap-2">
                <View className="flex-1">
                  <AppButton
                    label={t("common.cancel")}
                    variant="outline"
                    disabled={deciding !== null}
                    onPress={() => setConfirmingApprove(false)}
                  />
                </View>
                <View className="flex-1">
                  <AppButton
                    label={
                      deciding === "approve"
                        ? t("common.approving")
                        : t("coordinator.review.approveAnyway")
                    }
                    disabled={deciding !== null}
                    onPress={() => void approve()}
                  />
                </View>
              </HStack>
            </VStack>
          ) : (
            <HStack className="gap-2">
              <View className="flex-1">
                <AppButton
                  label={t("common.reject")}
                  variant="outline"
                  disabled={deciding !== null}
                  onPress={() => setConfirmingReject(true)}
                />
              </View>
              <View className="flex-1">
                <AppButton
                  label={deciding === "approve" ? t("common.approving") : t("common.approve")}
                  disabled={deciding !== null}
                  onPress={onApprovePressed}
                />
              </View>
            </HStack>
          )
        ) : null}
      </ScrollView>

      <Modal isOpen={zoomedPhoto !== null} onClose={() => setZoomedPhoto(null)} size="full">
        <ModalBackdrop />
        <ModalContent className="border-0 bg-transparent p-4">
          <ModalCloseButton className="self-end bg-card" />
          <ModalBody className="items-center justify-center" scrollEnabled={false}>
            {zoomedPhoto ? (
              <Image
                source={{ uri: zoomedPhoto }}
                className="aspect-square w-full rounded-card"
                alt={`${t(cropLabelKey(crop.id))} photo, full size`}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

function DetailRow({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "warning" | "destructive";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <HStack className="min-h-tap items-center justify-between gap-3">
      <Text className="type-body text-muted-foreground">{label}</Text>
      <Text className={`type-body-bold shrink text-right ${toneClass}`} numberOfLines={1}>
        {value}
      </Text>
    </HStack>
  );
}

const BENCHMARK_TONE = {
  success: { box: "bg-success-subtle", text: "text-success" },
  warning: { box: "bg-warning-subtle", text: "text-warning" },
  info: { box: "bg-info-subtle", text: "text-info" },
  muted: { box: "bg-muted", text: "text-muted-foreground" }
} as const;

/** The coordinator's one piece of read-only context for the price itself: how it sits against
 *  the benchmark they (or another coordinator) already published for this crop. `comparison` is
 *  also what gates the Approve confirmation below — shared via `compareToBenchmark` so the card
 *  and the gate can never disagree on what counts as "outside". */
function PriceBenchmarkCard({
  status,
  comparison
}: {
  status: "loading" | "error" | "ready";
  comparison: BenchmarkComparison | null;
}) {
  const { t } = useTranslation();
  if (status === "loading") {
    return (
      <VStack className="gap-1 rounded-card border border-border bg-card p-4">
        <Text className="type-h4 text-foreground">{t("coordinator.review.marketPrice")}</Text>
        <Text className="type-caption text-muted-foreground">
          {t("coordinator.review.checkingBenchmark")}
        </Text>
      </VStack>
    );
  }
  if (status === "error" || !comparison) return null;

  const { box, text } = BENCHMARK_TONE[comparison.tone];
  return (
    <VStack className={`gap-1 rounded-card p-4 ${box}`}>
      <Text className={`type-h4 ${text}`}>{t("coordinator.review.marketPrice")}</Text>
      <Text className={`type-caption ${text}`}>{comparison.message}</Text>
    </VStack>
  );
}
