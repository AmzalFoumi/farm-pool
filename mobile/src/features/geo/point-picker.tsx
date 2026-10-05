import { districtPoint, type GeoPoint } from "@farm-pool/shared";
import { useState } from "react";
import MapView, { Marker, type LatLng } from "react-native-maps";

import { AppButton } from "@/components/app/app-button";
import { MAP_PROVIDER } from "@/features/geo/map-provider";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * Drop a pin on a place (FARM-26). Used by the farmer for a farm gate and the buyer for a
 * delivery point — the two are the same gesture and must behave identically.
 *
 * The pin is tapped and dragged rather than typed, because nobody knows their own latitude and a
 * typed pair is a transposition waiting to happen.
 *
 * **Optional wherever it is used, and visibly so.** No signal, no GPS fix or no patience must
 * never stop someone posting produce or placing an order — readers fall back to the district and
 * say so. Making it required would turn a convenience into a barrier.
 *
 * No "use my current location" button. People fill these in from the house as often as from the
 * place itself, and a fix taken somewhere else is worse than no pin at all because it looks
 * exact. The pin placed deliberately is the one worth storing.
 */
export function PointPicker({
  district,
  title,
  help,
  unsetNote,
  value,
  onChange
}: {
  /** The district to centre on until a pin is placed. */
  district: string;
  title: string;
  help: string;
  /** What is shown when nothing is pinned — says what happens without one. */
  unsetNote: string;
  value?: GeoPoint;
  onChange: (point: GeoPoint | undefined) => void;
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
        <Text className="type-h4 text-foreground">{title}</Text>
        <Text className="type-caption text-muted-foreground">{help}</Text>
      </VStack>

      <Box className="h-52 overflow-hidden rounded-card border border-border">
        <MapView
          provider={MAP_PROVIDER}
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
              title={title}
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
              : unsetNote}
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
