import type { GeoPoint, RouteStopView } from "@farm-pool/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, useWindowDimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { MAP_PROVIDER } from "@/features/geo/map-provider";

/**
 * Google's URL API takes at most nine waypoints between the origin and the destination.
 *
 * A planned day is well under that today, but the cap is real and silently dropping stops from
 * the middle of a driver's run is the worst possible way to hit it — they would simply never
 * arrive somewhere a farmer is waiting. So the overflow is named in the button's label instead,
 * and the hand-off carries the first nine plus the final stop.
 */
const MAX_WAYPOINTS = 9;

/** How long the camera takes to travel between "the whole day" and "this one stop". */
const CAMERA_MS = 420;

/** The span a focused stop is framed at — roughly 2 km, enough to see its approach road. */
const FOCUS_DELTA = 0.02;

/** How long a pin keeps redrawing itself after its appearance changes. One frame is enough in
 *  practice; this is slack for a slow first layout. */
const SETTLE_MS = 600;

/**
 * The whole run on one map (FARM-61, Figma 196:5906).
 *
 * **Full-bleed, and the sheet sits on it.** The Route screen is the one a driver has open while
 * driving, so the map is the screen rather than a thumbnail at the top of a list — the stop list
 * rides over its bottom half in `RouteSheet`. Everything here that positions the camera therefore
 * takes the sheet's height as an obstruction: a pin centred on the screen would be centred
 * *under* the sheet, which is the one place the driver cannot see.
 *
 * **A straight line between stops, not a drawn route.** The real road is not known — `distanceKm`
 * is haversine and the planner scales it by a factor — so drawing a convincing curve along roads
 * the app has not actually routed would be a picture claiming knowledge it does not have. A driver
 * who followed it into a river would be right to be angry. The line says "these places, in this
 * order", which is true.
 *
 * **The button on it is what gives real turns, for the whole day at once.** Each stop already
 * hands off to Google Maps one destination at a time (`job-map.tsx`); this hands off the entire
 * run as one multi-stop trip, in the committed order. That is the same reasoning as there —
 * routing a rural road network is what the installed maps app is for, it holds the driver's
 * offline tiles, and it costs no API quota — applied to the question this screen actually asks,
 * which is "what am I doing today, and in what order".
 *
 * Numbered pins, because the number is the whole point of the screen: the order is a schedule the
 * driver committed to, not a suggestion.
 */
export function RouteMap({
  stops,
  selectedStopId,
  topInset,
  obstructedBottom
}: {
  stops: readonly RouteStopView[];
  /** The stop the sheet is currently showing, if any. The camera follows it. */
  selectedStopId?: string;
  /** Status bar and notch — the floating button must clear them. */
  topInset: number;
  /** How much of the map's bottom the sheet covers, in points. */
  obstructedBottom: number;
}) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);

  /* The camera cannot be moved before the map has laid out — a `fitToCoordinates` fired against an
     unmeasured map is simply dropped, which showed up as the first paint staying on whatever
     `initialRegion` guessed. */
  const [ready, setReady] = useState(false);

  const coordinates = stops.map((s) => asCoordinate(s.point));
  const selected = stops.find((s) => s.id === selectedStopId);

  /* The visible slice of the map: below the status bar, above the sheet. Its centre is where a
     focused pin has to land, and it is not the centre of the screen. */
  const visibleHeight = Math.max(height - topInset - obstructedBottom, 1);
  const visibleCentreFraction = (topInset + visibleHeight / 2) / height;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || coordinates.length === 0) return;

    if (selected) {
      map.animateToRegion(focusRegion(selected.point, visibleCentreFraction), CAMERA_MS);
      return;
    }
    map.fitToCoordinates(coordinates, {
      edgePadding: {
        top: topInset + 48,
        left: 48,
        right: 48,
        /* The sheet, plus a margin — otherwise the lowest stop is fitted to the screen edge and
           ends up behind it. */
        bottom: obstructedBottom + 48
      },
      animated: true
    });
    // `coordinates` is rebuilt every render; the stop ids are what actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedStopId, stops, topInset, obstructedBottom, visibleCentreFraction]);

  if (stops.length === 0) return null;

  const openRouteInGoogleMaps = () => {
    const asParam = (c: { latitude: number; longitude: number }) => `${c.latitude},${c.longitude}`;

    /* No `origin`. Omitted, Google starts from where the driver actually is, which on a run they
       are part-way through is the only useful answer — pinning the origin to stop 1 would route
       them back to a farm they left an hour ago. Every stop is therefore a waypoint except the
       last, which is the destination. */
    const destination = coordinates[coordinates.length - 1];
    const waypoints = coordinates.slice(0, -1).slice(0, MAX_WAYPOINTS);

    const url =
      `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
      `&destination=${asParam(destination)}` +
      (waypoints.length > 0 ? `&waypoints=${waypoints.map(asParam).join("|")}` : "");

    void Linking.openURL(url);
  };

  /* Named, not counted silently: if the run is longer than the hand-off can carry, the label says
     how many stops are going rather than letting the driver assume it is all of them. */
  const carried = Math.min(coordinates.length - 1, MAX_WAYPOINTS) + 1;
  const truncated = carried < coordinates.length;

  return (
    <Box className="absolute inset-0">
      <MapView
        testID="route-map"
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={{ flex: 1 }}
        onMapReady={() => setReady(true)}
        /* Fitted to every stop with room for the pins, so a run across two districts is readable
           without the driver pinching to find the far end. The effect above re-fits it properly
           once the map can be measured; this is only what the first frame draws. */
        initialRegion={regionFor(coordinates)}
        /* Pannable now, unlike the old thumbnail: this is the driving screen, and a driver
           checking the road between two stops must be able to move the map. */
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
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
          <StopMarker key={stop.id} stop={stop} selected={stop.id === selectedStopId} />
        ))}
      </MapView>

      {/* Over the map, top right, clear of the status bar. White pill so it reads against
          satellite imagery as well as the default tiles. */}
      <Pressable
        onPress={openRouteInGoogleMaps}
        accessibilityRole="button"
        accessibilityLabel={t("route.openInMapsLabel", { count: carried })}
        style={{ top: topInset + 12 }}
        className="elevation-card absolute right-3 min-h-tap justify-center rounded-pill bg-card px-4"
      >
        <Text className="type-body-sm-bold text-primary">
          {truncated ? t("route.openFirstInMaps", { count: carried }) : t("route.openInMaps")}
        </Text>
      </Pressable>
    </Box>
  );
}

/**
 * One numbered pin.
 *
 * `tracksViewChanges` is the catch with a custom marker view: left on, every frame of the map is
 * a bitmap re-render of each pin, which a low-end phone feels. It is turned on only for the
 * moment a pin changes appearance — selection, or a status going from "to collect" to "on the
 * lorry" — and back off once that frame has been captured.
 */
function StopMarker({ stop, selected }: { stop: RouteStopView; selected: boolean }) {
  const collected = stop.status === "in_transit" || stop.status === "delivered";

  /* Derived during render rather than in an effect: by the time an effect runs, the pin has
     already been drawn once with tracking off, and that is the frame the map would keep. */
  const appearance = `${selected}|${collected}`;
  const [drawn, setDrawn] = useState(appearance);
  const [tracking, setTracking] = useState(true);
  if (drawn !== appearance) {
    setDrawn(appearance);
    setTracking(true);
  }

  useEffect(() => {
    if (!tracking) return;
    const timer = setTimeout(() => setTracking(false), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [tracking]);

  return (
    <Marker
      coordinate={asCoordinate(stop.point)}
      tracksViewChanges={tracking}
      title={`${stop.position}. ${stop.farmerName}`}
      description={stop.town ? `${stop.town}, ${stop.district}` : stop.district}
      /* The selected pin draws over its neighbours — two stops in the same village would
         otherwise hide the one the driver just tapped. */
      zIndex={selected ? 2 : 1}
    >
      <Box
        className={`elevation-card items-center justify-center rounded-pill border-2 ${
          selected ? "h-10 w-10 border-card bg-primary" : "h-8 w-8 border-card"
        } ${collected && !selected ? "bg-success" : selected ? "bg-primary" : "bg-brand-deep"}`}
      >
        <Text className="type-body-sm-bold text-primary-foreground">{stop.position}</Text>
      </Box>
    </Marker>
  );
}

function asCoordinate(point: GeoPoint) {
  return { latitude: point.latitude, longitude: point.longitude };
}

/**
 * A region that puts one stop in the middle of what the driver can actually see.
 *
 * `centreFraction` is where the visible centre sits down the screen — about a third of the way
 * when the sheet covers the bottom half. The region is centred on the screen, so the point is
 * pushed north of it by exactly that difference.
 */
function focusRegion(point: GeoPoint, centreFraction: number) {
  return {
    latitude: point.latitude - (0.5 - centreFraction) * FOCUS_DELTA,
    longitude: point.longitude,
    latitudeDelta: FOCUS_DELTA,
    longitudeDelta: FOCUS_DELTA
  };
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
