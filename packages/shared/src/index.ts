/**
 * Types and zod schemas imported by both `mobile/` and `api/`.
 *
 * Define something here the moment a second workspace needs it — not before. A shared package with
 * one consumer is indirection for its own sake. See `.plans/STRUCTURE.md`.
 *
 * HOW IT IS CONSUMED
 * - `api/` and TypeScript resolve `main` / `types` → `dist/`, built by `npm run build` in this
 *   package (also run automatically by `prepare` on a root `npm install`).
 * - Metro resolves the `react-native` field → `src/`, so the app hot-reloads source.
 * After editing anything here, rebuild before touching `api/`: the api compiles against `dist/`,
 * and a stale `dist/` is a type error that points at the wrong place.
 *
 * The identity schemas were the first occupants: the mobile forms validate against the same
 * `registerSchema` / `loginSchema` the api validates request bodies with, which is the whole
 * reason this package exists. `catalog/` and `orders/` follow the same rule — a listing, a wanted
 * request and an order are each one zod object read by the api's controllers and the app's screens.
 */
export * from "./identity/role";
export * from "./identity/phone";
export * from "./identity/auth";
export * from "./identity/jwt";
export * from "./identity/permissions";
export * from "./catalog/crops";
export * from "./catalog/listing";
export * from "./catalog/wanted";
export * from "./orders/order";
