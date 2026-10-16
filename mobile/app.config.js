/**
 * Extends `app.json` with values that must not be committed.
 *
 * The Google Maps key is compiled into the Android manifest by the `react-native-maps` config
 * plugin. Expo Go supplies its own key, but a development or release build has none, and
 * Google Maps without one stops the app the moment a map is drawn (`.plans/DECISIONS.md`, "Maps").
 * `app.json` is committed and this repository is public, so the key comes from `mobile/.env`
 * (gitignored), which Expo loads before reading this file.
 *
 * Unset, the plugin is left out entirely and the build behaves exactly as it did before.
 * Changing the key means re-running `npx expo prebuild` and rebuilding: it is native config,
 * not JavaScript.
 */
module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_KEY?.trim();
  if (!androidGoogleMapsApiKey) return config;

  return {
    ...config,
    plugins: [...(config.plugins ?? []), ["react-native-maps", { androidGoogleMapsApiKey }]]
  };
};
