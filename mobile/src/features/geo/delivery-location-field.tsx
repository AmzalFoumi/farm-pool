import type { DropOff, PublicUser, SavedLocation } from "@farm-pool/shared";
import { useState } from "react";

import { AppButton } from "@/components/app/app-button";
import { AppTextField } from "@/components/app/app-text-field";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { locationsApi } from "@/features/geo/api";
import { PointPicker } from "@/features/geo/point-picker";
import { ApiError } from "@/lib/api";

/**
 * Where the buyer wants the load delivered (FARM-26).
 *
 * **Saved places first, pin second.** A wholesale buyer sends load after load to the same two or
 * three markets, so the common case is one tap on a place they already named; pinning is the
 * exception, not the default. Showing the saved list collapsed behind a "new place" button would
 * invert that.
 *
 * Choosing a saved place **copies** its label and point into the order rather than referencing
 * it, which is why this hands the parent a whole `DropOff` and not an id. Renaming or deleting a
 * saved place later must not rewrite where a past delivery went.
 *
 * **The session arrives as props, not from `useAuth`.** This renders inside the Place order
 * Actionsheet, and gluestack mounts an Actionsheet through a portal — outside the subtree under
 * `AuthProvider`, so a `useAuth()` here throws "must be used inside <AuthProvider>". The screen
 * that owns the sheet is inside the provider and already passes `token` down for exactly this
 * reason; the saved list and the update callback follow the same route.
 */
export function DeliveryLocationField({
  district,
  value,
  onChange,
  token,
  savedLocations,
  onUserChanged
}: {
  /** Where to centre a new pin — the listing's district, so the map opens near the farm. */
  district: string;
  value?: DropOff;
  onChange: (dropOff: DropOff | undefined) => void;
  token: string;
  savedLocations: readonly SavedLocation[];
  /** Hands the updated user back up so the session's saved list stays current. */
  onUserChanged: (user: PublicUser) => void;
}) {
  const saved = savedLocations;

  const [pinning, setPinning] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (location: SavedLocation) => {
    setPinning(false);
    onChange({ label: location.label, point: location.point });
  };

  /* Saving is optional and separate from choosing: a one-off delivery should not clutter the
     list the buyer picks from every week. The order already carries the point either way. */
  const saveForNextTime = async () => {
    if (!token || !value) return;
    setError(null);
    setSaving(true);
    try {
      const user = await locationsApi.save(token, {
        label: label.trim(),
        point: value.point
      });
      onUserChanged(user);
      onChange({ label: label.trim(), point: value.point });
      setLabel("");
    } catch (e) {
      setError(
        e instanceof ApiError ? (e.issues[0]?.message ?? e.message) : "Could not save that place."
      );
    } finally {
      setSaving(false);
    }
  };

  const chosenSaved = value?.label ? saved.find((l) => l.label === value.label) : undefined;

  return (
    <VStack className="gap-3">
      <VStack className="gap-0.5">
        <Text className="type-body-bold text-foreground">Deliver to</Text>
        <Text className="type-caption text-muted-foreground">
          Optional. Without it the driver sees the district only, and no distance is shown.
        </Text>
      </VStack>

      {saved.length > 0 ? (
        <VStack className="gap-2">
          {saved.map((location) => {
            const selected = chosenSaved?.id === location.id;
            return (
              <Pressable
                key={location.id}
                onPress={() => choose(location)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`min-h-tap flex-row items-center justify-between gap-3 rounded-card border px-4 py-3 ${
                  selected ? "border-2 border-primary bg-secondary" : "border-border bg-card"
                }`}
              >
                <Text className="type-body flex-1 text-foreground" numberOfLines={1}>
                  {location.label}
                </Text>
                {selected ? (
                  <Box className="rounded-pill bg-primary px-2 py-0.5">
                    <Text className="type-body-sm-bold text-primary-foreground">Chosen</Text>
                  </Box>
                ) : null}
              </Pressable>
            );
          })}
        </VStack>
      ) : null}

      {pinning ? (
        <VStack className="gap-3">
          <PointPicker
            district={district}
            title="Delivery point"
            help="Tap the map where the load should be dropped."
            unsetNote="Nothing pinned yet"
            value={value?.point}
            onChange={(point) => onChange(point ? { point } : undefined)}
          />

          {value ? (
            <VStack className="gap-2">
              <AppTextField
                label="Save this place for next time (optional)"
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Dambulla economic centre"
              />
              {error ? (
                <Text className="type-caption text-destructive" accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}
              <AppButton
                label={saving ? "Saving…" : "Save this place"}
                variant="outline"
                disabled={saving || label.trim().length === 0}
                onPress={() => void saveForNextTime()}
              />
            </VStack>
          ) : null}
        </VStack>
      ) : (
        <HStack className="gap-2">
          <AppButton
            label={saved.length > 0 ? "Somewhere else" : "Pin the delivery point"}
            variant="outline"
            onPress={() => setPinning(true)}
          />
          {value ? (
            <AppButton label="Clear" variant="outline" onPress={() => onChange(undefined)} />
          ) : null}
        </HStack>
      )}
    </VStack>
  );
}
