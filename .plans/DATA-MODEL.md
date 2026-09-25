# Data model — what is in the database today

What the api already stores, field by field, so the schema the team finalises starts from the
code rather than overwriting it. Written 18 September 2026, after FARM-22 / FARM-35 / FARM-36.

**Sources of truth, in order.** The wire shape (what the app and the api exchange) is the zod
object in `packages/shared/src/<domain>/*.ts`. The storage shape is the Mongoose class in
`api/src/<domain>/infrastructure/persistence/*.schema.ts`. Where the two differ, the table below
says so. This document is a reading aid: if it disagrees with those files, the files win — fix the
document.

Four collections exist: `users`, `listings`, `wanted_listings`, `orders`. All four use Mongoose
`timestamps: true`, so every document also has `createdAt` and `updatedAt` (`Date`) written by the
database, and `_id` (ObjectId) which the api exposes as the string `id`.

Ids are stored as plain strings, not `ObjectId` references. Nothing is enforced by the database
across collections; the use-cases do the checking (for example `PlaceOrder` loads the listing
before writing an order). Relationships are listed per collection below.

## `users`

Owner: `identity`. Storage: `api/src/identity/infrastructure/persistence/user.schema.ts`. Wire:
`publicUserSchema` in `packages/shared/src/identity/auth.ts` (never includes the password hash).

| Field | Type | Required | Index | Meaning | On the wire? |
| ----- | ---- | -------- | ----- | ------- | ------------ |
| `displayName` | string, trimmed | yes | | The name shown to others. 2–60 chars. | yes |
| `phone` | string, E.164 `+94xxxxxxxxx` | yes | unique | The account identifier. Normalised by `phoneSchema` before storing, so `077…`, `94…` and `+94…` are one account. | yes |
| `email` | string, lower-cased | no | unique, sparse | Reserved for a later email credential. Not collected today. Sparse means absent-is-fine; **never write `null`**, leave the field out. | yes (optional) |
| `passwordHash` | string | yes | | scrypt hash (`infrastructure/security/scrypt-password-hasher.ts`). | **no** |
| `role` | enum `Role` | yes | | `farmer`, `buyer`, `coordinator`, `logistics`. `logistics` is what the picker labels "Delivery partner". | yes |
| `status` | enum `AccountStatus` | yes, default `active` | | `active`, `pending_review`, `suspended`. Stored and returned; **no guard checks it yet**. | yes |

All four roles self-register through `POST /identity/register` (`.plans/auth/README.md`). Coordinator
stays a public sign-up path; whether to gate or seed one is open (`.plans/auth/OPEN.md`).

## `listings`

Owner: `catalog`. Storage: `catalog/infrastructure/persistence/listing.schema.ts`. Wire:
`listingSchema` in `packages/shared/src/catalog/listing.ts`.

| Field | Type | Required | Index | Meaning | On the wire? |
| ----- | ---- | -------- | ----- | ------- | ------------ |
| `farmerId` | string → `users._id` | yes | yes | Who is selling. | yes |
| `farmerName` | string | yes | | **Snapshot** of the farmer's `displayName` at creation, so browsing is one query. A rename does not rewrite old listings. | yes |
| `cropId` | enum `CropId` | yes | yes | One of the twelve ids in `CROPS` (below). | yes |
| `quantityKg` | integer ≥ 1 | yes | | What is on offer. **Not reduced when an order is placed**; farmer acceptance (unbuilt) will do that. | yes |
| `pricePerKg` | number ≥ 0 | yes | | Rupees. | yes |
| `harvestDate` | string `YYYY-MM-DD` | yes | | A calendar date stored as text so it does not shift a day between Sri Lanka and UTC. | yes |
| `district` | string, trimmed, 2–40 | yes | | As typed, for display. | yes |
| `districtKey` | string | yes | yes | Lower-cased copy of `district`, written by the repository, for a case-insensitive filter. | **no** |
| `minOrderKg` | integer ≥ 1 | yes | | Smallest quantity a buyer may order. Optional on create; 1 (no minimum) when the farmer sets none. | yes |
| `status` | enum `ListingStatus` | yes | yes | `draft`, `pending_approval`, `verified`, `rejected`, `sold`. Buyers are served `verified` only. | yes |
| `seedKey` | string | no | unique, sparse | Set only by `npm run seed:listings -w api` so a re-run updates the same rows. Real listings never have one. | **no** |

Today only the dev seed writes listings; farmer listing creation (FARM-21) will add the endpoint.

## `wanted_listings`

Owner: `catalog`. Storage: `catalog/infrastructure/persistence/wanted.schema.ts`. Wire:
`wantedListingSchema` / `createWantedSchema` in `packages/shared/src/catalog/wanted.ts`.

A buyer's crop request, the "reverse listing" from `.plans/PRODUCT.md`.

| Field | Type | Required | Index | Meaning | On the wire? |
| ----- | ---- | -------- | ----- | ------- | ------------ |
| `buyerId` | string → `users._id` | yes | yes | Who is asking. Taken from the token, never the body. | yes |
| `cropId` | enum `CropId` | yes | | | yes |
| `quantityKg` | integer ≥ 1 | yes | | | yes |
| `maxPricePerKg` | number ≥ 0 | no | | The most the buyer will pay. | yes (optional) |
| `neededBy` | string `YYYY-MM-DD` | yes | | | yes |
| `district` | string, 2–40 | yes | | Where delivery is wanted. No `districtKey` here yet; nothing filters on it. | yes |
| `note` | string ≤ 280 | no | | Free text. | yes (optional) |
| `status` | enum `WantedStatus` | yes, default `open` | yes | `open`, `closed`. `expired` is expected later when a job runs over `neededBy`. | yes |

Farmer responses to a request are not modelled. The plan is a separate `responses` concept beside
this collection, not an array inside it.

## `orders`

Owner: `orders`. Storage: `orders/infrastructure/persistence/order.schema.ts`. Wire:
`orderSchema` / `placeOrderSchema` in `packages/shared/src/orders/order.ts`.

One document per order, one listing per order (every research workflow is one crop, one listing,
one order; `items[]` is added beside these fields only if multi-item orders are ever wanted).

| Field | Type | Required | Index | Meaning | On the wire? |
| ----- | ---- | -------- | ----- | ------- | ------------ |
| `buyerId` | string → `users._id` | yes | yes | From the token. | yes |
| `farmerId` | string → `users._id` | yes | yes | **Copied from the listing** on the server. | yes |
| `farmerName` | string | yes | | **Snapshot** from the listing. | yes |
| `listingId` | string → `listings._id` | yes | yes | | yes |
| `cropId` | enum `CropId` | yes | | **Copied from the listing.** | yes |
| `quantityKg` | integer ≥ 1 | yes | | Must sit between the listing's `minOrderKg` and `quantityKg` at placement. | yes |
| `pricePerKg` | number ≥ 0 | yes | | **Snapshot** of the listing price at placement; a later price change does not alter an existing order. | yes |
| `total` | number ≥ 0 | yes | | `quantityKg × pricePerKg`, computed in `PlaceOrder`. | yes |
| `note` | string ≤ 280 | no | | | yes (optional) |
| `status` | enum `OrderStatus` | yes | yes | See lifecycle below. | yes |

The client sends only `listingId`, `quantityKg` and `note`. Everything else is filled on the server
from the token and the listing, so a buyer cannot set their own price or farmer.

### Order lifecycle

```
requested ──farmer──▶ accepted ──▶ open ──▶ assigned ──▶ in_transit ──▶ delivered
    │
    ├──farmer──▶ declined
    └──buyer───▶ cancelled        (only while `requested`)
```

Written today: `requested` (on place) and `cancelled` (buyer cancel). Every other value is in the
enum so it does not change under whoever builds farmer acceptance, logistics and delivery.
`ACTIVE_ORDER_STATUSES` (`requested`, `accepted`, `open`, `assigned`, `in_transit`) is what the Home
screen counts as "active".

## Enums, in one place

| Enum | Where declared | Values |
| ---- | -------------- | ------ |
| `Role` | `shared/src/identity/role.ts` | `farmer`, `buyer`, `coordinator`, `logistics` |
| `AccountStatus` | `shared/src/identity/role.ts` | `active`, `pending_review`, `suspended` |
| `Action` (permissions) | `shared/src/identity/permissions.ts` | twelve `<resource>:<verb>` strings; matrix in `.plans/auth/README.md` |
| `CropId` | `shared/src/catalog/crops.ts` | `tomato`, `green-chilli`, `brinjal`, `mango`, `pumpkin`, `carrot`, `banana`, `papaya`, `onion`, `potato`, `rice`, `coconut` |
| `ListingStatus` | `shared/src/catalog/listing.ts` | `draft`, `pending_approval`, `verified`, `rejected`, `sold` |
| `WantedStatus` | `shared/src/catalog/wanted.ts` | `open`, `closed` |
| `OrderStatus` | `shared/src/orders/order.ts` | `requested`, `accepted`, `declined`, `cancelled`, `open`, `assigned`, `in_transit`, `delivered` |

Every Mongoose `enum:` option is read from the zod enum (`roleSchema.options`, `CROP_IDS`, and so
on), so the database can never accept a value the app does not know. Add a value in the zod file
and both sides get it; the Mongoose schema needs no edit.

**Crops are a constant, not a collection** (`.plans/DECISIONS.md`). When crops need per-region
benchmark prices or coordinator editing, `CROPS` becomes a `crops` collection whose `_id` values
are these same ids, and the screens keep reading `cropById`.

## Relationships

```
users ──< listings          listings.farmerId
users ──< wanted_listings   wanted_listings.buyerId
users ──< orders            orders.buyerId, orders.farmerId
listings ──< orders         orders.listingId
```

**Snapshot fields are copies, not joins, on purpose.** `farmerName` on listings and orders, and
`pricePerKg`, `farmerId`, `cropId` on orders, are copied at write time so a list screen is one
query and an order still reads correctly after the listing changes or is sold. If the team's final
model normalises these away, the browse and order screens each gain a second query or a lookup.

## Where the code differs from the team's draft model

The team's draft schema (kept in Confluence, not in this repo) was written before these stories.
Each difference below is a decision that has already been made in code; changing it back means
changing the shared zod file, the Mongoose schema, the use-case and the screens together.

| Team draft | In the code | Why | Recorded in |
| ---------- | ----------- | --- | ----------- |
| Orders start at `open` | Orders start at `requested`; `accepted`, `declined`, `cancelled` sit in front of `open` | Product doc: buyer requests, farmer accepts or negotiates | `.plans/DECISIONS.md`, `api/src/orders/README.md` |
| No table for buyer requests | `wanted_listings` collection in `catalog` | The reverse listing is in the product doc; it is a market offer from the other side | `.plans/DECISIONS.md` |
| Listing has no district or minimum order | `district`, `districtKey`, `minOrderKg` on listings | Buyers filter by district; order quantity needs a floor | `api/src/catalog/README.md` |
| Crops as a table | `CROPS` constant in shared | Nobody edits the list at runtime yet | `.plans/DECISIONS.md` |
| Farmer acceptance step | Not built; `quantityKg` on the listing is not reduced at placement | Another story owns it | `api/src/orders/README.md` |
| Farmer name looked up | `farmerName` snapshot on listings and orders | One query per list screen | this file |
| Separate `email` credential | `email` field reserved, sparse-unique, not collected | Phone is the identifier; email can be switched on without a migration | `.plans/auth/README.md` |

If the draft uses different column names for the same things (for example a `full_name` for
`displayName`, or `driver` for the `logistics` role), the code's names are the ones the app and
the api already share; renaming them is a shared-package change, not a database-only one.

## Not modelled yet

So nobody assumes it is: produce photos and image storage, quality grade, expiry, pickup
coordinates or depots, saved or favourite farmers, benchmark prices, payments, delivery
assignments and driver verification, in-app calls or messages (`calls` tab is a placeholder),
farmer responses to wanted requests, coordinator approval records, refresh tokens or sessions.
Each is one optional field or one new collection when its story arrives; none needs a change to
what exists.

## How to change a field

1. **Shared zod first.** Edit the object in `packages/shared/src/<domain>/*.ts`. Form validation
   and the api's request parsing change together.
2. **Mongoose schema second.** Add or change the `@Prop` in
   `api/src/<domain>/infrastructure/persistence/*.schema.ts`. Read enums from the zod schema.
3. **Mapper third.** The `to<Entity>` function in `mongoose-<entity>.repository.ts` (document →
   domain) and `to<Entity>Dto` in `domain/entities/` (domain → wire) each need the field. The
   in-memory repository beside it is used by unit tests and needs nothing unless the field has
   behaviour.
4. **Rebuild shared** (`npm run build -w @farm-pool/shared`) before touching `api/`, then run
   `npm test -w api` and `npm run test:e2e -w api`. Screens read `src/` directly and need no build.
5. **Existing documents.** There are no migrations. A new required field breaks reads of old
   documents; make it optional or give it a `default`, or write a one-off script in `api/src/cli/`
   (the seed is the pattern).

Recipe for a whole new collection: `.plans/PLAYBOOK.md`, "Add an api domain or endpoint".
