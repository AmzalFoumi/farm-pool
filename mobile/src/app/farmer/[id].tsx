/**
 * Farmer detail (FARM-44) — everything the farmer named when registering, so the coordinator can
 * actually verify them before accepting or rejecting, rather than deciding from a bare name on a
 * list row. Reuses the already-fetched Farmers list rather than a dedicated endpoint — same
 * reuse pattern Set Crop Price uses for its crop's context.
 *
 * Rejecting requires typing a reason: it is stored on the farmer's own account and shown back to
 * them on `/account-status` — the reason the field is mandatory here, not optional.
 */

import type { CooperativeFarmer } from "@farm-pool/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/app/app-bar";
import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { coordinationApi } from "@/features/coordination/api";
import { FarmerStatusPill } from "@/features/coordination/farmer-status-pill";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export default function FarmerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const farmers = useRequest(() => coordinationApi.farmers(token ?? ""), token ?? "");

  return (
    <View className="flex-1 bg-background">
      <AppBar title="Farmer" onBack={() => router.back()} />
      <RequestView request={farmers}>
        {(rows) => {
          const farmer = rows.find((f) => f.id === id);
          if (!farmer) {
            return (
              <EmptyNote title="Not found" note="This farmer is no longer in your cooperative." />
            );
          }
          return (
            <FarmerDetail farmer={farmer} token={token ?? ""} onDecided={() => router.back()} />
          );
        }}
      </RequestView>
    </View>
  );
}

function FarmerDetail({
  farmer,
  token,
  onDecided
}: {
  farmer: CooperativeFarmer;
  token: string;
  onDecided: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setError(null);
    setDeciding("approve");
    try {
      await coordinationApi.approveFarmer(token, farmer.id);
      onDecided();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not approve this farmer");
    } finally {
      setDeciding(null);
    }
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setError(null);
    setDeciding("reject");
    try {
      await coordinationApi.rejectFarmer(token, farmer.id, reason.trim());
      onDecided();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reject this farmer");
    } finally {
      setDeciding(null);
    }
  };

  return (
    <ScrollView
      contentContainerClassName="gap-4 p-gutter"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <VStack className="gap-3 rounded-card border border-border bg-card p-4">
        <HStack className="items-center justify-between">
          <Text className="type-h3 text-foreground" numberOfLines={1}>
            {farmer.displayName}
          </Text>
          <FarmerStatusPill status={farmer.status} />
        </HStack>
        <DetailRow label="Phone number" value={farmer.phone} />
        <DetailRow label="District" value={farmer.district ?? "Not given"} />
        <DetailRow label="Registered" value={formatDate(farmer.createdAt)} />
        <DetailRow
          label="Listings"
          value={`${farmer.listingCount} ${farmer.listingCount === 1 ? "listing" : "listings"}`}
        />
      </VStack>

      {error ? <Text className="type-caption text-destructive">{error}</Text> : null}

      {farmer.status === "pending_review" ? (
        confirmingReject ? (
          <VStack className="gap-3 rounded-card border border-border bg-card p-4">
            <AppTextField
              label="Reason for rejecting"
              value={reason}
              onChangeText={setReason}
              placeholder="Why isn't this farmer being approved?"
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
                onPress={() => void approve()}
              />
            </View>
          </HStack>
        )
      ) : null}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack className="min-h-tap items-center justify-between">
      <Text className="type-body text-muted-foreground">{label}</Text>
      <Text className="type-body-bold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </HStack>
  );
}
