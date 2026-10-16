import type { RouteStopView } from "@farm-pool/shared";
import MapView, { Marker, Polyline } from "react-native-maps";

import { Box } from "@/components/ui/box";
import { MAP_PROVIDER } from "@/features/geo/map-provider";

/**
 * The whole run on one map (FARM-61, Figma 196:5906).
 *
 * **A straight line between stops, not a drawn route.** The real road is not known — `distanceKm`
 * is haversine and the planner scales it by a factor — so drawing a convincing curve along roads
 * the app has not actually routed would be a picture claiming knowledge it does not have. A driver
 * who followed it into a river would be right to be angry. The line says "these places, in this
 * order", which is true; the Directions hand-off on each stop is what gives real turns.
 *
 * Numbered pins, because the number is the whole point of the screen: the order is a schedule the
 * driver committed to, not a suggestion.
 */
export function RouteMap({ stops }: { stops: readonly RouteStopView[] }) {
  if (stops.length === 0) return null;

  const coordinates = stops.map((s) => ({
    latitude: s.point.latitude,
    longitude: s.point.longitude
  }));

  return (
    <Box className="h-64 overflow-hidden rounded-card border border-border">
      <MapView
        testID="route-map"
        provider={MAP_PROVIDER}
        style={{ flex: 1 }}
        /* Fitted to every stop with room for the pins, so a run across two districts is readable
           without the driver pinching to find the far end. */
        initialRegion={regionFor(coordinates)}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {stops.length > 1 ? (
          <Polyline
            coordinates={coordinates}
            strokeWidth={3}
            /* Dashed, deliberately: a solid line reads as a surveyed route. Dashes read as
               "between these points", which is all this knows. */
            lineDashPattern={[8, 6]}
            strokeColor="#1e6b48"
          />
        ) : null}

        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{
              latitude: stop.point.latitude,
              longitude: stop.point.longitude
            }}
            title={`${stop.position}. ${stop.farmerName}`}
            description={stop.town ? `${stop.town}, ${stop.district}` : stop.district}
          />
        ))}
      </MapView>
    </Box>
  );
}

/** A region holding every stop, with a margin so no pin sits on the edge. */
function regionFor(points: readonly { latitude: number; longitude: number }[]) {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    /* The floor matters for a single stop, or two in the same village: without it the delta is 0
       and the map opens zoomed to the centimetre. */
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05)
  };
}
