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

/* Same wording as the buyer's listing detail and the listing wizard's review step. */
const PACKAGING_LABELS: Record<ListingPackaging, string> = {
  "plastic-crate": "Plastic crates",
  "wooden-box": "Wooden boxes",
  cardboard: "Cardboard cartons",
  "mesh-bag": "Mesh bags"
};

const FULFILLMENT_LABELS: Record<FulfillmentOption, string> = {
  shared: "Shared transport",
  solo: "Solo transport"
};

export default function ListingReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const listings = useRequest(() => coordinationApi.listings(token ?? ""), token ?? "");
  const benchmarks = useRequest(() => coordinationApi.benchmarks(token ?? ""), token ?? "");

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Listing" onBack={() => router.back()} />
      <RequestView request={listings}>
        {(rows) => {
          const listing = rows.find((l) => l.id === id);
          if (!listing) {
            return (
              <EmptyNote title="Not found" note="This listing is no longer in your cooperative." />
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
      setError(e instanceof ApiError ? e.message : "Could not approve this listing");
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
      setError(e instanceof ApiError ? e.message : "Could not reject this listing");
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
    listing.variety ? { label: "Variety", value: listing.variety } : null,
    listing.grade ? { label: "Grade", value: `Grade ${listing.grade}` } : null,
    listing.packaging ? { label: "Packaging", value: PACKAGING_LABELS[listing.packaging] } : null,
    listing.certifications?.length
      ? { label: "Certifications", value: listing.certifications.join(", ") }
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
                accessibilityLabel={`View ${crop.name} photo ${i + 1} larger`}
              >
                <Image
                  source={{ uri }}
                  size="2xl"
                  className="rounded-card bg-muted"
                  alt={`${crop.name} photo ${i + 1}`}
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
              {crop.name}
            </Text>
            <ListingStatusPill status={listing.status} />
          </HStack>
          <DetailRow label="Farmer" value={listing.farmerName} />
          <DetailRow label="Quantity" value={`${listing.quantityKg} kg`} />
          <DetailRow label="Unit price" value={`${formatPrice(listing.pricePerKg)} / kg`} />
          <DetailRow label="Minimum order" value={`${listing.minOrderKg} kg`} />
          <DetailRow label="Harvest date" value={formatDate(listing.harvestDate)} />
          {freshness !== null ? (
            <DetailRow
              label="Freshness"
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
            <Text className="type-h4 text-foreground">Produce details</Text>
            {produceDetails.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </VStack>
        ) : null}

        <VStack className="gap-3 rounded-card border border-border bg-card p-4">
          <Text className="type-h4 text-foreground">Pickup</Text>
          <DetailRow label="Location" value={place} />
          {listing.address ? <DetailRow label="Address" value={listing.address} /> : null}
          <DetailRow label="Farm gate pin" value={listing.pickupPoint ? "Dropped" : "Not set"} />
          {listing.fulfillmentOption ? (
            <DetailRow label="Transport" value={FULFILLMENT_LABELS[listing.fulfillmentOption]} />
          ) : null}
          {listing.farmgateNotes ? (
            <Text className="type-body pt-1 text-foreground">{listing.farmgateNotes}</Text>
          ) : null}
        </VStack>

        {listing.status === "rejected" && listing.rejectionReason ? (
          <VStack className="gap-1 rounded-card border border-destructive bg-destructive-subtle p-4">
            <Text className="type-body-bold text-destructive">Rejected</Text>
            <Text className="type-body text-destructive">{listing.rejectionReason}</Text>
          </VStack>
        ) : null}

        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

        {listing.status === "pending_approval" ? (
          confirmingReject ? (
            <VStack className="gap-3 rounded-card border border-border bg-card p-4">
              <AppTextField
                label="Reason for rejecting"
                value={reason}
                onChangeText={setReason}
                placeholder="What needs to change before this can be approved?"
              />
              <HStack className="gap-2">
                <View className="flex-1">
                  <AppButton
                    label="Cancel"
                    variant="outline"
                    disabled={deciding !== null}
                    onPress={() => setConfirmingReject(false)}
                  />
                </View>
                <View className="flex-1">
                  <AppButton
                    label={deciding === "reject" ? "Rejecting…" : "Confirm reject"}
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
                Approve this listing anyway?
              </Text>
              <HStack className="gap-2">
                <View className="flex-1">
                  <AppButton
                    label="Cancel"
                    variant="outline"
                    disabled={deciding !== null}
                    onPress={() => setConfirmingApprove(false)}
                  />
                </View>
                <View className="flex-1">
                  <AppButton
                    label={deciding === "approve" ? "Approving…" : "Yes, approve anyway"}
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
                  label="Reject"
                  variant="outline"
                  disabled={deciding !== null}
                  onPress={() => setConfirmingReject(true)}
                />
              </View>
              <View className="flex-1">
                <AppButton
                  label={deciding === "approve" ? "Approving…" : "Approve"}
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
                alt={`${crop.name} photo, full size`}
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
  if (status === "loading") {
    return (
      <VStack className="gap-1 rounded-card border border-border bg-card p-4">
        <Text className="type-h4 text-foreground">Market price</Text>
        <Text className="type-caption text-muted-foreground">Checking the benchmark…</Text>
      </VStack>
    );
  }
  if (status === "error" || !comparison) return null;

  const { box, text } = BENCHMARK_TONE[comparison.tone];
  return (
    <VStack className={`gap-1 rounded-card p-4 ${box}`}>
      <Text className={`type-h4 ${text}`}>Market price</Text>
      <Text className={`type-caption ${text}`}>{comparison.message}</Text>
    </VStack>
  );
}
