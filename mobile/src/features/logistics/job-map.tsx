import { districtPoint, type PickupPoint } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { Linking, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { Box } from "@/components/ui/box";
import { MAP_PROVIDER } from "@/features/geo/map-provider";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/**
 * Where a pickup is, on a map, with a way into turn-by-turn directions (LP-22, LP-40).
 *
 * **The map is district-level and says so.** Nothing in the data holds a farm-gate coordinate, so
 * the pin is the district's administrative centre from `DISTRICT_POINTS`, not the gate. Telling
 * the driver that in words matters more than it might look: a pin that claims a precision it does
 * not have is worse than a town name, because a driver will follow it down the wrong lane. The
 * farmer's number and the gate notes are what actually finish the journey, and they sit directly
 * under this on the job screen.
 *
 * **Directions open in the real Google Maps app**, rather than being drawn here. Routing across a
 * rural road network is exactly what the installed maps app is better at, it already holds the
 * driver's offline tiles, and it costs no API quota. Drawing a polyline would need the billed
 * Directions API and would still be worse.
 *
 * Renders nothing for a district the table does not know — the field is free text, so an unknown
 * spelling is ordinary, and no map is better than a confidently wrong one.
 */
export function JobMap({
  district,
  town,
  pickupPoint,
  label
}: {
  district: string;
  town?: string;
  /** The farm gate the farmer pinned (FARM-26). When present this is what is shown. */
  pickupPoint?: PickupPoint;
  /** What the pin is — the farmer's name, usually. */
  label: string;
}) {
  const { t } = useTranslation();

  /* The farmer's own pin beats the district centre whenever there is one. The two are not the
     same claim and must not look the same: an exact gate zooms in and promises a destination,
     a centroid stays wide and says so in the caption below.

     The fallback is kept as its own binding rather than merged into `point`, so the caption can
     name the district without a cast — the two branches really do carry different information,
     and collapsing them into one union only hid that. */
  const fallback = districtPoint(district);
  const point = pickupPoint ?? fallback;
  if (!point) return null;
  const exact = pickupPoint !== undefined;

  const place = town ? `${town}, ${district}` : district;

  const openDirections = () => {
    /* With a real gate, hand the maps app the coordinates and ask for navigation — it is the
       farm, not a town, and no search string would find it. Without one, search by place name
       instead: the maps app's own index knows the town far better than a district centre does,
       so the driver still lands closer than this preview can show. */
    const url = exact
      ? `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Sri Lanka`)}`;
    void Linking.openURL(url);
  };

  return (
    <VStack className="gap-2">
      <Box className="h-44 overflow-hidden rounded-card border border-border">
        <MapView
          provider={MAP_PROVIDER}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: point.latitude,
            longitude: point.longitude,
            /* An exact gate is worth ~1.5 km of context so the driver sees the approach road;
               a district centre stays at ~30 km, which reads as a place without implying a
               street the pin cannot actually promise. */
            latitudeDelta: exact ? 0.015 : 0.3,
            longitudeDelta: exact ? 0.015 : 0.3
          }}
          /* A preview, not a map to pan: every gesture is off so a scroll through the job screen
             cannot be swallowed by the map. `liteMode` is Android-only and renders a static
             bitmap there, which is cheaper on a low-end phone. */
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          liteMode={Platform.OS === "android"}
        >
          <Marker
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={label}
            description={place}
          />
        </MapView>
      </Box>

      {/* The caption carries the precision, and is the reason both cases are allowed to look
          similar: a driver must never have to guess whether a pin is a gate or a district. */}
      <Text className="type-body-sm text-muted-foreground">
        {exact || !fallback
          ? t("jobs.detail.exactPin")
          : t("jobs.detail.approximate", { district: fallback.name })}
      </Text>

      <Pressable
        onPress={openDirections}
        accessibilityRole="button"
        accessibilityLabel={t("jobs.detail.directionsLabel", { place })}
        className="min-h-tap justify-center"
      >
        <Text className="type-body-bold text-primary">{t("jobs.detail.directions")}</Text>
      </Pressable>
    </VStack>
  );
}
