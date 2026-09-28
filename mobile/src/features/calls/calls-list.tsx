/**
 * The calls this user made or received (FARM-24). Shared by the buyer's Calls tab and the
 * farmer's `/calls` screen, which differ only in how they are reached.
 *
 * There are no push notifications yet, so a farmer learns about a new request here: the list
 * reloads whenever the screen regains focus, and on pull-down.
 */

import type { Call } from "@farm-pool/shared";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList } from "react-native";

import { EmptyNote, RequestView } from "@/components/app/request-view";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { callsApi } from "@/features/calls/api";
import { CallStatusPill } from "@/features/orders/status-pill";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useReloadOnRefocus, useRequest } from "@/lib/use-request";
import { useAuth } from "@/providers/auth-provider";

export function CallsList({ bottomInset }: { bottomInset: number }) {
  const { token, user } = useAuth();
  const calls = useRequest(() => callsApi.mine(token ?? ""), token ?? "");
  useFocusEffect(useReloadOnRefocus(calls.reload));

  return (
    <RequestView request={calls}>
      {(rows) => (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.id}
          refreshing={false}
          onRefresh={calls.reload}
          contentContainerClassName="gap-3 p-gutter"
          contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
          renderItem={({ item }) => (
            <CallRow
              call={item}
              incoming={item.calleeId === user?.id}
              token={token ?? ""}
              onChanged={calls.reload}
            />
          )}
          ListEmptyComponent={
            <EmptyNote
              title="No calls yet"
              note="Buyers can request a video call from a listing to see the produce before ordering."
            />
          }
        />
      )}
    </RequestView>
  );
}

function CallRow({
  call,
  incoming,
  token,
  onChanged
}: {
  call: Call;
  incoming: boolean;
  token: string;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otherName = incoming ? call.callerName : call.calleeName;

  const answer = async (choice: "accept" | "decline") => {
    setBusy(true);
    setError(null);
    try {
      await callsApi.answer(token, call.id, choice);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not answer");
    } finally {
      setBusy(false);
    }
  };

  const join = () =>
    router.push({ pathname: "/call/[id]", params: { id: call.id, name: otherName } });

  const note =
    call.status === "requested"
      ? incoming
        ? "Wants a video call about your listing"
        : `Waiting for ${otherName} to accept`
      : `${incoming ? "From" : "To"} ${otherName} · ${formatDate(call.createdAt)}`;

  return (
    <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-3">
      <HStack className="items-center gap-3">
        <VStack className="flex-1 gap-0.5">
          <Text className="type-body-bold text-foreground" numberOfLines={1}>
            {otherName}
          </Text>
          <Text className="type-caption text-muted-foreground" numberOfLines={2}>
            {note}
          </Text>
        </VStack>
        <CallStatusPill status={call.status} />
      </HStack>

      {incoming && call.status === "requested" ? (
        <HStack className="gap-3">
          <RowButton label="Decline" onPress={() => void answer("decline")} disabled={busy} />
          <RowButton label="Accept" onPress={() => void answer("accept")} disabled={busy} primary />
        </HStack>
      ) : null}

      {call.status === "active" ? (
        <RowButton label="Join call" onPress={join} disabled={busy} primary />
      ) : null}

      {error ? <Text className="type-caption text-destructive">{error}</Text> : null}
    </VStack>
  );
}

function RowButton({
  label,
  onPress,
  disabled,
  primary = false
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className={`min-h-tap flex-1 items-center justify-center rounded-field px-3 active:opacity-80 ${
        primary ? "bg-primary" : "border border-border bg-card"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <Text className={`type-body-bold ${primary ? "text-primary-foreground" : "text-foreground"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
