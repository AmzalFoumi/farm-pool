import { districtPoint, type PickupPoint } from "@farm-pool/shared";
import { useState } from "react";
import MapView, { Marker, PROVIDER_GOOGLE, type LatLng } from "react-native-maps";

import { AppButton } from "@/components/app/app-button";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * Where the lorry should actually come (FARM-26).
 *
 * The farmer drags a pin rather than typing coordinates, because nobody knows their farm's
 * latitude and a typed pair is a transposition waiting to happen. The map opens centred on the
 * district they already chose on this step, so the first drag is short.
 *
 * **Optional, and visibly so.** A farmer with no signal, no GPS fix, or no patience must still be
 * able to post produce — the driver falls back to the district centre and is told that is what
 * they are looking at. Making this required would mean a farmer who cannot drop a pin cannot
 * sell, which is a worse failure than an approximate map.
 *
 * No "use my current location" button. A farmer fills this in from the house as often as from the
 * field, and a GPS fix taken in the wrong place is worse than no pin at all: it looks exact. The
 * pin they place deliberately is the one worth storing.
 */
export function PickupPointField({
  district,
  value,
  onChange
}: {
  /** The district chosen earlier on this step; the map opens here. */
  district: string;
  value?: PickupPoint;
  onChange: (point: PickupPoint | undefined) => void;
}) {
  const centre = districtPoint(district);
  const [touched, setTouched] = useState(false);

  /* Until the district is one the table knows, there is nowhere sensible to open the map. The
     field hides rather than guessing at a centre — the farmer is still typing the district. */
  if (!centre) return null;

  const pin = value ?? { latitude: centre.latitude, longitude: centre.longitude };

  /* Tapping the map and dragging the marker are different event types in react-native-maps, and
     only the coordinate is common to both — so that is all this takes. */
  const place = (event: { nativeEvent: { coordinate: LatLng } }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTouched(true);
    onChange({ latitude, longitude });
  };

  return (
    <VStack className="elevation-card gap-3 rounded-card border border-border bg-card p-4">
      <VStack className="gap-0.5">
        <Text className="type-h4 text-foreground">Farm gate</Text>
        <Text className="type-caption text-muted-foreground">
          Tap the map where a lorry should come. Optional — without it the driver sees the district
          only.
        </Text>
      </VStack>

      <Box className="h-52 overflow-hidden rounded-card border border-border">
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: pin.latitude,
            longitude: pin.longitude,
            /* ~5 km: wide enough to find the village, tight enough that one tap is meaningful. */
            latitudeDelta: 0.05,
            longitudeDelta: 0.05
          }}
          onPress={place}
          /* Panning and zooming stay on here, unlike the driver's read-only preview — placing a
             pin is exactly the case where the farmer needs to move the map. */
          toolbarEnabled={false}
        >
          {value ? (
            <Marker
              coordinate={value}
              draggable
              onDragEnd={place}
              title="Farm gate"
              /* Draggable as well as tappable: a tap gets within a field, a drag gets the gate. */
            />
          ) : null}
        </MapView>
      </Box>

      <HStack className="items-center justify-between gap-3">
        <Text className="type-caption flex-1 text-muted-foreground">
          {value
            ? `Pinned at ${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`
            : touched
              ? "No pin set"
              : `Not set — drivers will see ${centre.name} district`}
        </Text>
        {value ? (
          <AppButton
            label="Clear"
            variant="outline"
            onPress={() => {
              setTouched(true);
              onChange(undefined);
            }}
          />
        ) : null}
      </HStack>
    </VStack>
  );
}
