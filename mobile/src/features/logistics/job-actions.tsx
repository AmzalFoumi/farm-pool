import type { JobDetail } from "@farm-pool/shared";
import { useState } from "react";
import { View } from "react-native";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { logisticsApi } from "@/features/logistics/api";
import { ApiError } from "@/lib/api";

/**
 * The one action a job is ready for, and nothing else (LP-24, LP-50, LP-52).
 *
 * The driver's stage in the trip decides the button, so there is never a choice to get wrong:
 * take it, confirm the load is on, confirm it is off. A delivered job shows no button at all.
 *
 * Why a weight field at pickup and not a plain confirm: the load on the vehicle regularly is not
 * the load on the order — a short harvest, produce rejected at the gate, a damaged crate. It is
 * pre-filled with the ordered quantity so a driver for whom nothing changed taps straight
 * through, and edits it only when something did.
 */
const MESSAGE: Record<string, string> = {
  job_taken: "Another driver took this job first.",
  load_too_heavy: "This load is heavier than your vehicle can carry.",
  no_vehicle: "Add your vehicle before accepting a job.",
  job_not_found: "This job is no longer available.",
  not_your_job: "This job is not yours any more.",
  wrong_stage: "This job has already moved on. Pull down to see where it is.",
  validation_error: "Enter the weight in whole kilograms.",
  network_error: "Can't reach the server. Check your connection and try again."
};

export function JobActions({
  job,
  token,
  bottomInset,
  onChanged
}: {
  job: JobDetail;
  token: string;
  bottomInset: number;
  /** Re-reads the job, so the next stage's button comes from the api, not from local state. */
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collected, setCollected] = useState(String(job.quantityKg));

  if (job.status === "delivered") return null;

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      onChanged();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "unknown";
      setError(MESSAGE[code] ?? "Could not do that. Please try again.");
      // The job may have moved under us; the reload says where it actually is.
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  /* Parsed here rather than trusted: an empty or non-numeric field must not reach the api as
     NaN, and the shared schema would reject it anyway — better to disable the button. */
  const collectedKg = Number.parseInt(collected, 10);
  const collectedValid = Number.isInteger(collectedKg) && collectedKg > 0;

  return (
    <View
      className="border-t border-border bg-card px-4 pt-3"
      style={{ paddingBottom: Math.max(bottomInset, 23) }}
    >
      <VStack className="gap-3">
        {job.status === "assigned" ? (
          <AppTextField
            label="Weight loaded"
            value={collected}
            onChangeText={setCollected}
            keyboardType="number-pad"
            returnKeyType="done"
            error={collectedValid ? undefined : "Enter the weight in whole kilograms"}
          />
        ) : null}

        {error ? (
          <Text className="type-body text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {job.status === "open" ? (
          <AppButton
            label={busy ? "Taking this job…" : "Take this job"}
            disabled={busy}
            onPress={() => void run(() => logisticsApi.accept(token, job.id))}
          />
        ) : null}

        {job.status === "assigned" ? (
          <AppButton
            label={busy ? "Confirming…" : "Confirm pickup"}
            disabled={busy || !collectedValid}
            onPress={() => void run(() => logisticsApi.confirmPickup(token, job.id, collectedKg))}
          />
        ) : null}

        {job.status === "in_transit" ? (
          <AppButton
            label={busy ? "Confirming…" : "Confirm delivery"}
            disabled={busy}
            onPress={() => void run(() => logisticsApi.confirmDelivery(token, job.id))}
          />
        ) : null}
      </VStack>
    </View>
  );
}
