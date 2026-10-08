import { Platform } from "react-native";
import { PROVIDER_GOOGLE, type MapViewProps } from "react-native-maps";

/**
 * Which map engine draws the tiles.
 *
 * The team chose Google Maps (`.plans/DECISIONS.md`, "Maps"), and on Android that is what this
 * returns — Expo Go bundles the Google Maps SDK there, so it works with no setup.
 *
 * **On iOS it deliberately does not.** `PROVIDER_GOOGLE` needs the Google Maps iOS SDK and an API
 * key compiled into the app; Expo Go ships neither, so asking for it renders a blank white box —
 * no error, no warning, just an empty map, which is exactly how this was found. Falling back to
 * `undefined` gives Apple Maps, which Expo Go does have, so iOS development keeps working.
 *
 * This is a development-time fallback, not a change of decision. Once the `react-native-maps`
 * config plugin carries `iosGoogleMapsApiKey` and the app is a development build rather than Expo
 * Go, this can return `PROVIDER_GOOGLE` on both platforms. Until then, a working Apple map beats a
 * blank Google one, and the Directions hand-off goes to Google either way.
 */
export const MAP_PROVIDER: MapViewProps["provider"] =
  Platform.OS === "android" ? PROVIDER_GOOGLE : undefined;
