/**
 * Font files imported as modules.
 *
 * Metro already treats `.ttf` as an asset and returns a module id from the import; TypeScript
 * has no way to know that, so the shape is declared here. `expo-font` takes exactly this value.
 * Expo's own `expo-env.d.ts` covers images but not fonts.
 */
declare module "*.ttf" {
  const asset: number;
  export default asset;
}
