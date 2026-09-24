# Catalog domain

**Owns:** what is on offer and what is wanted. Produce **listings** a farmer sells (crop, quantity,
price per kg, harvest date, pickup district, minimum order) and **wanted requests** a buyer posts
(crop, quantity, needed-by date, district, optional ceiling price).

Built in FARM-22 / FARM-36 from the buyer's side first. Farmer listing creation (the
`listing:create` action is in the permission matrix; no endpoint yet — FARM-21) and coordinator
approval add use-cases here; they do not change the layout. Recipe: `.plans/PLAYBOOK.md`.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/` (`Listing`, `WantedListing`, their `to…Dto` mappers) and `repositories/` (**interfaces only** — `ListingRepository`, `WantedRepository`, with their injection symbols). No NestJS, no Mongoose; ESLint rejects it. | `packages/shared` |
| `application/` | `services/` — the use-cases (`ListListings`, `GetListing`, `CreateWanted`, `ListWanted`, `CloseWanted`), plain constructor-injected classes; `errors.ts` — `CatalogError`, a `DomainError` with stable codes. Request and response shapes are the zod schemas in `packages/shared`. | `domain/`, `shared/kernel` |
| `infrastructure/persistence/` | Mongoose schemas for the `listings` and `wanted_listings` collections, the Mongoose repositories, and in-memory repositories for unit tests. | `domain/` |
| `catalog.controller.ts` | HTTP handlers: `ZodValidationPipe(schema)` → one use-case → return. | `application/` |
| `catalog.module.ts` | Binds the two repository ports to Mongoose, builds the use-cases with `useFactory`, exports `LISTING_REPOSITORY` for `orders`. | all of the above |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| GET | `/catalog/listings?crop=&district=` | `listing:read` (everyone) | 200 `Listing[]` — `verified` only, newest first, max 50 |
| GET | `/catalog/listings/:id` | `listing:read` | 200 `Listing`; 404 `listing_not_found` (also for a non-verified listing) |
| POST | `/catalog/listings` | `listing:create` (farmer) | 201 `Listing`, `pending_approval`, `farmerName` copied from the account; 404 `farmer_not_found` |
| GET | `/catalog/wanted?mine=true` | `wanted:read` (everyone) | 200 `WantedListing[]` — the caller's own; without `mine`, every open request |
| POST | `/catalog/wanted` | `wanted:create` (buyer) | 201 `WantedListing`; 400 `validation_error` |
| POST | `/catalog/wanted/:id/close` | `wanted:create` | 200; 403 `not_your_request`; 409 `wanted_already_closed`; 404 `wanted_not_found` |

Errors are `{ code, message }` via `DomainErrorFilter` (`src/shared/http`), registered once in
`app.module.ts`.

## Rules worth knowing

- **Buyers see `verified` only.** `GetListing` treats a draft or rejected listing as not found so
  an id cannot be guessed. The status enum is the team's data model: `draft`,
  `pending_approval`, `verified`, `rejected`, `sold`.
- **Crops are a shared constant**, not a collection (`CROPS` in `packages/shared`). Nobody edits
  the list at runtime yet; the day a coordinator does, it becomes a collection and the screens do
  not change. The emoji on each crop is the stand-in for a photo until image storage exists.
- **`farmerName` is copied onto the listing** so a browse page is one query. A rename does not
  rewrite old listings.
- **Dates are calendar strings** (`YYYY-MM-DD`), not `Date`, so a harvest date does not shift a
  day between Sri Lanka and UTC.
- **`district` is matched case-insensitively** through a lower-cased `districtKey` field.

## Flow

`GET /catalog/listings?crop=&district=`, the read path every list screen copies:

| Step | File | What happens |
| ---- | ---- | ------------ |
| 1 | `mobile/src/app/(tabs)/listings.tsx` | `useRequest(() => listingsApi.list(token), token)`; `RequestView` draws loading, error, empty. |
| 2 | `mobile/src/features/listings/api.ts` | `apiFetch("/catalog/listings?…", { token, schema: listingListSchema })`. |
| 3 | `identity/auth/*` | Token verified; `@Allow('listing:read')` passes for every role. |
| 4 | `catalog.controller.ts` | `ZodValidationPipe(listingQuerySchema)` on the query string; calls `ListListings`. |
| 5 | `application/services/list-listings.ts` | Asks the repository for `verified` listings matching the filter, newest first, max 50. |
| 6 | `infrastructure/persistence/mongoose-listing.repository.ts` | Builds the Mongo query (`districtKey` for the district); `toListing` maps each document. |
| 7 | `domain/entities/listing.ts` | `toListingDto` per row; 200 `Listing[]`. |
| 8 | back in the app | The array is validated against `listingListSchema`; `ListingGridCard` renders each row. |

`POST /catalog/wanted` and `POST /catalog/wanted/:id/close` are the write path: the same steps
with `createWantedSchema` on the body, `@CurrentUser()` for the buyer id, and `CloseWanted`
refusing with `not_your_request` (`forbidden`) or `wanted_already_closed` (`conflict`). On the
app side `wanted/new.tsx` parses with the shared schema first, then `router.back()` and the list
reloads on focus (`useReloadOnRefocus`).

## Reuse points

- **`LISTING_REPOSITORY`** is exported from `catalog.module.ts`; `orders` injects it to read the
  listing an order is placed against. Farmer listing creation adds `create` to the same interface.
- `CROPS`, `cropById`, `cropIdSchema` in `packages/shared/src/catalog/crops.ts`; `districtSchema`,
  `kgSchema`, `pricePerKgSchema` in `listing.ts` are the field rules to reuse for any crop, kg or
  price input anywhere.
- App pieces: `CropTile`, `ListingGridCard`, `ListingListRow` in `mobile/src/features/listings/`.
- Tests: `application/services/listings.spec.ts` and `wanted.spec.ts` (in-memory repositories),
  `api/test/catalog.e2e-spec.ts`.

## Dev seed (temporary)

```
npm run seed:listings -w api
```

`src/cli/seed-listings.ts` creates one farmer (`+94771000001`, password `SEED_PASSWORD` or
`longenough`) and upserts eight verified listings by a `seedKey`, so re-running updates rather than
duplicates. It refuses to run with `NODE_ENV=production`. Delete it when FARM-21 ships.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
