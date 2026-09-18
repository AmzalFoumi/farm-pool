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
