/**
 * Respond to one buyer request (FARM-47): pick one of your approved listings of that crop, name
 * a price and a quantity. The response is an offer the buyer can accept, counter or decline.
 */

import { createOfferSchema, cropById, type Listing, type WantedListing } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { cropLabelKey } from "@/features/listings/crop-label";
import { listingsApi } from "@/features/listings/api";
import { offersApi } from "@/features/offers/api";
import { offerErrorMessage } from "@/features/offers/error-message";
import { wantedApi } from "@/features/wanted/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

type Loaded = { request: WantedListing; listings: Listing[] };

export default function RespondScreen() {
  const { t } = useTranslation();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  /* There is no "one request" endpoint, and the open list is short (the api caps it at 50), so
     the request is found in it. A request that was just closed is simply not there any more. */
  const loaded = useRequest<Loaded>(async () => {
    const [open, mine] = await Promise.all([
      wantedApi.open(token ?? ""),
      listingsApi.mine(token ?? "")
    ]);
    const request = open.find((w) => w.id === id);
    if (!request) throw new ApiError(409, "wanted_closed", "The buyer has closed this request.");
    return {
      request,
      listings: mine.filter((l) => l.status === "verified" && l.cropId === request.cropId)
    };
  }, `${token}|${id}`);

  return (
    <View className="flex-1 bg-background">
      <AppBar title={t("farmer.requests.respond")} />
      <RequestView request={loaded}>
        {(data) => (
          <RespondForm
            request={data.request}
            listings={data.listings}
            token={token ?? ""}
            bottomInset={insets.bottom}
            onCreateListing={() => router.push("/(farmer)/create-listing/create")}
            onSent={(offerId) =>
              router.replace({ pathname: "/my-offers/[id]", params: { id: offerId } })
            }
          />
        )}
      </RequestView>
    </View>
  );
}

function RespondForm({
  request,
  listings,
  token,
  bottomInset,
  onCreateListing,
  onSent
}: {
  request: WantedListing;
  listings: Listing[];
  token: string;
  bottomInset: number;
  onCreateListing: () => void;
  onSent: (offerId: string) => void;
}) {
  const { t } = useTranslation();
  const crop = cropById(request.cropId);
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const listing = listings.find((l) => l.id === listingId);

  const [price, setPrice] = useState(String(listings[0]?.pricePerKg ?? ""));
  const [quantity, setQuantity] = useState(
    String(Math.min(request.quantityKg, listings[0]?.quantityKg ?? request.quantityKg))
  );
  const [note, setNote] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const summary = (
    <VStack className="gap-1 rounded-card border border-border bg-card p-4">
      <Text className="type-h4 text-foreground">
        {t(cropLabelKey(crop.id))} · {request.quantityKg} kg
      </Text>
      <Text className="type-caption text-muted-foreground">
        Needed by {formatDate(request.neededBy)} · deliver to {request.district}
      </Text>
      {request.maxPricePerKg ? (
        <Text className="type-caption text-muted-foreground">
          The buyer will pay up to {formatPrice(request.maxPricePerKg)} per kg.
        </Text>
      ) : null}
      {request.note ? <Text className="type-body pt-2 text-foreground">{request.note}</Text> : null}
    </VStack>
  );

  if (!listing) {
    return (
      <ScrollView contentContainerClassName="gap-4 p-gutter">
        {summary}
        <EmptyNote
          title={`No approved ${t(cropLabelKey(crop.id)).toLowerCase()} listing`}
          note={t("farmer.requests.detailNote")}
        />
        <AppButton label={t("farmer.requests.createListing")} onPress={onCreateListing} />
      </ScrollView>
    );
  }

  const rupees = Number(price);
  const kg = Number(quantity);
  const rangeHint = `Between ${listing.minOrderKg} kg and ${listing.quantityKg} kg`;
  const inRange = Number.isInteger(kg) && kg >= listing.minOrderKg && kg <= listing.quantityKg;

  const submit = async () => {
    setPriceError(null);
    setQuantityError(null);
    setError(null);

    const parsed = createOfferSchema.safeParse({
      listingId: listing.id,
      listingType: "WANTED",
      wantedId: request.id,
      proposedPrice: rupees,
      proposedQuantityKg: kg,
      ...(note.trim() ? { note } : {})
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "proposedPrice") setPriceError(issue.message);
        else if (issue.path[0] === "proposedQuantityKg") setQuantityError(issue.message);
        else setError(issue.message);
      }
      return;
    }
    if (!inRange) {
      setQuantityError(rangeHint);
      return;
    }

    setSubmitting(true);
    try {
      const offer = await offersApi.create(token, parsed.data);
      onSent(offer.id);
    } catch (e) {
      if (e instanceof ApiError && e.code === "offer_exists") {
        // Already answered this request: open that response instead of refusing.
        const existing = (await offersApi.mine(token).catch(() => [])).find(
          (o) => o.wantedId === request.id && (o.status === "PENDING" || o.status === "NEGOTIATING")
        );
        if (existing) {
          onSent(existing.id);
          return;
        }
      }
      if (e instanceof ApiError && e.code === "quantity_out_of_range") setQuantityError(e.message);
      else setError(offerErrorMessage(e, "Could not send your response"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerClassName="gap-4 p-gutter" keyboardShouldPersistTaps="handled">
        {summary}

        <VStack className="gap-2">
          <Text className="type-body-bold text-foreground">{t("farmer.requests.sellFrom")}</Text>
          {listings.map((item) => {
            const selected = item.id === listingId;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setListingId(item.id);
                  setPrice(String(item.pricePerKg));
                  setQuantity(String(Math.min(request.quantityKg, item.quantityKg)));
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.quantityKg} kilos at ${item.pricePerKg} rupees, ${item.district}`}
                className={`min-h-tap flex-row items-center justify-between gap-3 rounded-card border p-3 ${
                  selected ? "border-primary bg-card" : "border-border bg-card"
                }`}
              >
                <VStack className="flex-1 gap-0.5">
                  <Text className="type-body-bold text-foreground" numberOfLines={1}>
                    {item.quantityKg} kg left · {formatPrice(item.pricePerKg)}/kg
                  </Text>
                  <Text className="type-caption text-muted-foreground" numberOfLines={1}>
                    {item.town ? `${item.town}, ${item.district}` : item.district}
                  </Text>
                </VStack>
                {selected ? (
                  <Text className="type-body-sm-bold text-primary">
                    {t("farmer.requests.selected")}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </VStack>

        <AppTextField
          testID="response-price"
          label={t("farmer.requests.priceLabel")}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          error={priceError ?? undefined}
        />
        <AppTextField
          testID="response-quantity"
          label={t("farmer.requests.quantityLabel")}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          error={quantityError ?? undefined}
        />
        <HStack className="items-center justify-between">
          <Text className="type-caption text-muted-foreground">{rangeHint}</Text>
          <Text className="type-body-bold text-foreground">
            {inRange && rupees > 0 ? formatPrice(kg * rupees) : "—"}
          </Text>
        </HStack>
        <AppTextField
          testID="response-note"
          label={t("farmer.requests.noteLabel")}
          value={note}
          onChangeText={setNote}
        />
        {error ? <Text className="type-caption text-destructive">{error}</Text> : null}
      </ScrollView>

      <VStack
        className="gap-2 border-t border-border bg-card px-gutter pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 23) }}
      >
        <AppButton
          testID="response-send"
          label={submitting ? "Sending…" : t("farmer.requests.send")}
          onPress={() => void submit()}
          disabled={submitting}
        />
        <Text className="type-caption text-center text-muted-foreground">
          {t("farmer.requests.buyerCan")}
        </Text>
      </VStack>
    </>
  );
}
