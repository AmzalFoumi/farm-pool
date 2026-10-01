import { districtPoint } from "@farm-pool/shared";
import { useTranslation } from "react-i18next";
import { Linking, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import { Box } from "@/components/ui/box";
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
  label
}: {
  district: string;
  town?: string;
  /** What the pin is — the farmer's name, usually. */
  label: string;
}) {
  const { t } = useTranslation();
  const point = districtPoint(district);
  if (!point) return null;

  const place = town ? `${town}, ${district}` : district;

  /* A query by place name, not by the centroid: the maps app's own search knows the town far
     better than a district centre does, so the driver lands closer than this preview can show. */
  const openDirections = () => {
    const query = encodeURIComponent(`${place}, Sri Lanka`);
    /* The universal cross-platform URL: the Google Maps app takes it when installed, and the
       browser falls back to Maps on the web when it is not. No per-platform scheme needed. */
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <VStack className="gap-2">
      <Box className="h-44 overflow-hidden rounded-card border border-border">
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: point.latitude,
            longitude: point.longitude,
            /* ~30 km across: the district reads as a place, without implying a street. */
            latitudeDelta: 0.3,
            longitudeDelta: 0.3
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

      <Text className="type-body-sm text-muted-foreground">
        {t("jobs.detail.approximate", { district: point.name })}
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
