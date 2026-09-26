/**
 * Set Crop Price (FARM-37, Figma node 428:5) — pushed from a Daily Benchmark row or a "Needs you
 * today" benchmark task. Shows what the coordinator already has to go on before they type a
 * number: the price last published (if any), what their own farmers are currently asking, and a
 * bar chart of every price this crop has actually been published at — all real reads, never
 * invented. `source` is always `"manual"`, see `benchmark-price.ts` in `packages/shared` for why.
 */

import { cropById, cropIdSchema, setBenchmarkPriceSchema } from "@farm-pool/shared";
import type { BenchmarkPrice, CropId, CropPriceContext } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function SetCropPriceScreen() {
  const router = useRouter();
  const { cropId: rawCropId } = useLocalSearchParams<{ cropId: string }>();
  const { token } = useAuth();
  const prices = useRequest(() => coordinationApi.benchmarks(token ?? ""), token ?? "");

  const parsedCropId = cropIdSchema.safeParse(rawCropId);

  return (
    <View className="flex-1 bg-background">
      <AppBar
        title={parsedCropId.success ? cropById(parsedCropId.data).name : "Set price"}
        onBack={() => router.back()}
      />

      {!parsedCropId.success ? (
        <EmptyNote title="Unknown crop" note="This crop isn't recognised." />
      ) : (
        <RequestView request={prices}>
          {(rows) => (
            <SetCropPriceForm
              cropId={parsedCropId.data}
              context={rows.find((row) => row.cropId === parsedCropId.data) ?? null}
              onSaved={() => router.back()}
            />
          )}
        </RequestView>
      )}
    </View>
  );
}

type Field = "lowPricePerKg" | "highPricePerKg";
type FieldErrors = Partial<Record<Field, string>>;

function SetCropPriceForm({
  cropId,
  context,
  onSaved
}: {
  cropId: CropId;
  context: CropPriceContext | null;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const history = useRequest(
    () => coordinationApi.benchmarkHistory(token ?? "", cropId),
    `${token ?? ""}|${cropId}`
  );

  const [low, setLow] = useState(context?.current?.lowPricePerKg.toString() ?? "");
  const [high, setHigh] = useState(context?.current?.highPricePerKg.toString() ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFormError(null);
    const parsed = setBenchmarkPriceSchema.safeParse({
      lowPricePerKg: low.trim() === "" ? undefined : Number(low),
      highPricePerKg: high.trim() === "" ? undefined : Number(high)
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await coordinationApi.setBenchmark(token ?? "", cropId, parsed.data);
      onSaved();
    } catch (e) {
      if (e instanceof ApiError && e.code === "validation_error") {
        const next: FieldErrors = {};
        for (const issue of e.issues) next[issue.path as Field] ??= issue.message;
        setErrors(next);
      } else {
        setFormError(e instanceof ApiError ? e.message : "Could not save the price");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="gap-4 p-gutter"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <VStack className="gap-1 rounded-card border border-border bg-card p-4">
          <Text className="type-body-bold text-foreground">What you already have to go on</Text>
          <Text className="type-caption text-muted-foreground">
            {context?.current
              ? `Last published ${formatDate(context.current.publishedAt)}: ${formatPrice(
                  context.current.lowPricePerKg
                )}–${formatPrice(context.current.highPricePerKg)}`
              : "No price has been published for this crop yet."}
          </Text>
          <Text className="type-caption text-muted-foreground">
            {context?.activeListingRange
              ? `Your farmers are asking ${formatPrice(
                  context.activeListingRange.lowPricePerKg
                )}–${formatPrice(context.activeListingRange.highPricePerKg)} across ${
                  context.activeListingRange.listingCount
                } ${context.activeListingRange.listingCount === 1 ? "listing" : "listings"}.`
              : "None of your farmers have an active listing for this crop right now."}
          </Text>
        </VStack>

        <VStack className="gap-2 rounded-card border border-border bg-card p-4">
          <Text className="type-body-bold text-foreground">Price history</Text>
          <PriceHistorySection history={history} />
        </VStack>

        <AppTextField
          label="Low price (Rs / kg)"
          value={low}
          onChangeText={setLow}
          keyboardType="decimal-pad"
          error={errors.lowPricePerKg}
        />
        <AppTextField
          label="High price (Rs / kg)"
          value={high}
          onChangeText={setHigh}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          error={errors.highPricePerKg}
        />

        {formError ? <Text className="type-caption text-destructive">{formError}</Text> : null}

        <AppButton
          label={submitting ? "Saving…" : "Publish price"}
          onPress={() => void submit()}
          disabled={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Not `RequestView`: this sits inside a card, not filling the screen — same reasoning as
 *  Region's `TasksSection`. */
function PriceHistorySection({
  history
}: {
  history: ReturnType<typeof useRequest<BenchmarkPrice[]>>;
}) {
  if (history.status === "loading") {
    return (
      <HStack className="items-center gap-2 py-2">
        <Spinner size="small" />
        <Text className="type-body text-muted-foreground">Loading history…</Text>
      </HStack>
    );
  }
  if (history.status === "error") {
    return <Text className="type-body text-muted-foreground">Could not load price history.</Text>;
  }
  return <PriceHistoryChart history={history.data} />;
}

/** Last twelve publishes, oldest to newest, each bar the midpoint of that publish's low/high —
 *  a shape, not a precise reading; the exact numbers are the text above it. */
const CHART_POINTS = 12;
const MIN_BAR_HEIGHT_PCT = 6;

function PriceHistoryChart({ history }: { history: BenchmarkPrice[] }) {
  const points = [...history].reverse().slice(-CHART_POINTS);

  if (points.length < 2) {
    return (
      <Text className="type-body text-muted-foreground">
        Not enough history yet to show a trend.
      </Text>
    );
  }

  const midpoints = points.map((p) => (p.lowPricePerKg + p.highPricePerKg) / 2);
  const min = Math.min(...midpoints);
  const max = Math.max(...midpoints);
  const range = max - min;

  return (
    <VStack className="gap-2">
      <HStack className="h-24 items-end gap-1">
        {points.map((point, i) => {
          const pct = range === 0 ? 100 : ((midpoints[i] - min) / range) * 100;
          return (
            <View
              key={point.id}
              className="flex-1 rounded-sm bg-primary"
              style={{ height: `${Math.max(pct, MIN_BAR_HEIGHT_PCT)}%` }}
            />
          );
        })}
      </HStack>
      <HStack className="justify-between">
        <Text className="type-caption text-muted-foreground">
          {formatDate(points[0].publishedAt)}
        </Text>
        <Text className="type-caption text-muted-foreground">
          {formatDate(points[points.length - 1].publishedAt)}
        </Text>
      </HStack>
    </VStack>
  );
}
