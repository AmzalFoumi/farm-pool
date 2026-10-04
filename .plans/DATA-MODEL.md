# Data model — what is in the database today

What the api already stores, field by field, so the schema the team finalises starts from the
code rather than overwriting it. Written 18 September 2026, after FARM-22 / FARM-35 / FARM-36.

**Sources of truth, in order.** The wire shape (what the app and the api exchange) is the zod
object in `packages/shared/src/<domain>/*.ts`. The storage shape is the Mongoose class in
`api/src/<domain>/infrastructure/persistence/*.schema.ts`. Where the two differ, the table below
says so. This document is a reading aid: if it disagrees with those files, the files win — fix the
document.

Six collections are described here: `users`, `listings`, `wanted_listings`, `orders`, `payments`,
`calls`. All six use Mongoose
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
| `driver` | embedded object | no | | A delivery partner's vehicle (FARM-45): `vehicleType` (enum `VehicleType`), `registration` (upper-cased plate), `capacityKg`, `operatingDistrict`, `verification` (enum `DriverVerification`: `pending`, `verified`, `rejected`), `updatedAt`. Absent for other roles and until the driver submits one. Only `pending` is written today. | yes (optional) |

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
| `collectedKg` | integer ≥ 1 | no | | What the driver actually loaded at the farm gate (LP-50), recorded at pickup and never overwritten. Deliberately **not** constrained against `quantityKg`: a short harvest and an over-collection are both ordinary, and refusing either would leave the driver no way to record the truth. `quantityKg` stays the deal agreed; this is what moved. | yes (optional) |
| `assignedDriverId` | string → `users._id` | no | yes | The driver who accepted the job (LP-24). Written only by the logistics domain, through `ORDER_REPOSITORY.assignDriver`, which sets it and `status: assigned` in one operation. **Only the id is stored** — the driver's name, plate and verification are read live from the account, so a farmer at the gate is never shown a badge that was true last week. | yes (optional) |

| `receivedAt` | Date | no | | When the buyer confirmed the produce arrived (FARM-51). Written once, by `ORDER_REPOSITORY.markReceived`, on a `delivered` order. The status stays `delivered`. | yes (optional, ISO string) |
| `priceProposal` | embedded object | no | | A new price waiting for the other side's answer (FARM-53): `proposedBy` (`buyer` / `farmer`), `pricePerKg`, `reason` (optional), `proposedAt`. Absent unless one is open; at most one at a time. Accepting it rewrites `pricePerKg` and `total`; either answer removes it. | yes (optional) |

The client sends only `listingId`, `quantityKg` and `note`. Everything else is filled on the server
from the token and the listing, so a buyer cannot set their own price or farmer.

### Order lifecycle

```
requested ──farmer──▶ accepted ──▶ open ──▶ assigned ──▶ in_transit ──▶ delivered
    │
    ├──farmer──▶ declined
    └──buyer───▶ cancelled        (only while `requested`)
```

Written today: `requested` (on place), `cancelled` (buyer cancel), `open` (the buyer paying an
`accepted` order, FARM-41), and `assigned` / `in_transit` / `delivered` (the driver). `accepted`
and `declined` wait on farmer acceptance (FARM-46).
`ACTIVE_ORDER_STATUSES` (`requested`, `accepted`, `open`, `assigned`, `in_transit`) is what the Home
screen counts as "active".

## `payments`

Owner: `payments`. Storage: `payments/infrastructure/persistence/payment.schema.ts`. Wire:
`paymentSchema` in `packages/shared/src/payments/payment.ts`.

The escrow record for one order (FARM-41). **No real money moves** — see `.plans/DECISIONS.md`,
"Payments". One document per order.

| Field | Type | Required | Index | Meaning | On the wire? |
| ----- | ---- | -------- | ----- | ------- | ------------ |
| `orderId` | string → `orders._id` | yes | **unique** | The index is what makes paying twice impossible. | yes |
| `buyerId` | string → `users._id` | yes | yes | Copied from the order. | yes |
| `farmerId` | string → `users._id` | yes | yes | Copied from the order. | yes |
| `total` | number ≥ 0 | yes | | What the deal is worth now. Follows the order's total when a price is renegotiated. | yes |
| `advanceAmount` | number ≥ 0 | yes | | Released to the farmer when the buyer paid: `ADVANCE_RATE` (30%) of the total at that moment, rounded to a rupee. Never changes afterwards. | yes |
| `heldAmount` | number ≥ 0 | yes | | Still held. `total − advanceAmount` while `in_escrow`; 0 once released. | yes |
| `status` | enum `PaymentStatus` | yes | yes | `in_escrow` → `released` (the buyer confirming receipt). | yes |
| `method` | enum `PaymentMethod` | yes | | `simulated` is the only value. | yes |
| `gatewayRef` | string | yes | | What the gateway called the charge. For reconciling against a real provider later. | **no** |
| `entries` | array of embedded objects | yes | | Every movement of money, oldest first, append-only: `kind` (`deposit`, `advance_release`, `balance_release`, `top_up`, `refund`), `amount`, `receiptNo` (`FP-YYMMDD-XXXXXX`), `at`. A receipt is these read back in order. | yes |

## `calls`

Owner: `calls`. Storage: `calls/infrastructure/persistence/call.schema.ts`. Wire: `callSchema` /
`callTokenSchema` in `packages/shared/src/calls/call.ts`.

One document per video call between two users about one listing. **No audio or video is stored**:
the media runs on Agora, and this collection only records who may join and when.

| Field | Type | Required | Index | Meaning | On the wire? |
| ----- | ---- | -------- | ----- | ------- | ------------ |
| `listingId` | string → `listings._id` | yes | yes | What the call is about. | yes |
| `callerId` | string → `users._id` | yes | yes | Who asked for the call (a buyer). From the token. | yes |
| `callerName` | string | yes | | **Snapshot** of the caller's `displayName`. | yes |
| `calleeId` | string → `users._id` | yes | yes | Who is called: the listing's farmer, copied from the listing. | yes |
| `calleeName` | string | yes | | **Snapshot** of the listing's `farmerName`. | yes |
| `status` | enum `CallStatus` | yes, default `requested` | yes | `requested` → `active` → `ended`, or `requested` → `declined`. | yes |
| `startedAt` | Date | no | | When the first join pass was issued. | yes (optional) |
| `endedAt` | Date | no | | When either person hung up. | yes (optional) |

The Agora channel is not stored: it is always `call_<_id>`, derived on the server.

## Enums, in one place

| Enum | Where declared | Values |
| ---- | -------------- | ------ |
| `Role` | `shared/src/identity/role.ts` | `farmer`, `buyer`, `coordinator`, `logistics` |
| `AccountStatus` | `shared/src/identity/role.ts` | `active`, `pending_review`, `suspended` |
| `Action` (permissions) | `shared/src/identity/permissions.ts` | `<resource>:<verb>` strings; matrix in `.plans/auth/README.md` |
| `CropId` | `shared/src/catalog/crops.ts` | `tomato`, `green-chilli`, `brinjal`, `mango`, `pumpkin`, `carrot`, `banana`, `papaya`, `onion`, `potato`, `rice`, `coconut` |
| `ListingStatus` | `shared/src/catalog/listing.ts` | `draft`, `pending_approval`, `verified`, `rejected`, `sold` |
| `WantedStatus` | `shared/src/catalog/wanted.ts` | `open`, `closed` |
| `OrderStatus` | `shared/src/orders/order.ts` | `requested`, `accepted`, `declined`, `cancelled`, `open`, `assigned`, `in_transit`, `delivered` |
| `PaymentStatus` | `shared/src/payments/payment.ts` | `in_escrow`, `released` |
| `PaymentEntryKind` | `shared/src/payments/payment.ts` | `deposit`, `advance_release`, `balance_release`, `top_up`, `refund` |
| `CallStatus` | `shared/src/calls/call.ts` | `requested`, `declined`, `active`, `ended` |

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
orders ──1 payments         payments.orderId (unique)
users ──< payments          payments.buyerId, payments.farmerId
users ──< calls             calls.callerId, calls.calleeId
listings ──< calls          calls.listingId
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

So nobody assumes it is: produce photos and image storage, quality grade, expiry, depots, saved or favourite farmers, benchmark prices, a real payment provider or payout (payments are simulated), delivery
batches and multi-stop routes, the driver verification *process* (the state is stored, nothing moves it past `pending`), in-app calls or messages (`calls` tab is a placeholder),
farmer responses to wanted requests, coordinator approval records, refresh tokens or sessions.
Each is one optional field or one new collection when its story arrives; none needs a change to
what exists.

## Places, and why there are no coordinates

`district` and `town` on a listing are free text, and nothing anywhere holds a latitude or a
longitude. The driver's pickup map therefore pins the **district centre**, resolved on the phone
from `DISTRICT_POINTS` in `packages/shared/src/catalog/districts.ts` — 25 fixed places in the
bundle, so it works with no signal and costs no geocoding quota. The map caption states that
precision rather than implying a farm gate.

A story that adds real farm-gate coordinates should put them on the **listing** (the place does not
change per order), as two optional numbers beside `district`, and prefer them over the table
wherever present.

**A buyer has no location at all** — not on the account, not on the order. So a drop-off cannot be
drawn today, which is why FARM-26 shipped the pickup half only. Whichever story fills this decides
whether a delivery address belongs on the order (it can differ per order) or on the buyer's
account; the order is the likelier home.

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
