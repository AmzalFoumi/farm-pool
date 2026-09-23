# Coordination — open questions, most urgent first

Things the team has to decide, not things that are broken. Each one says what happens if it is
left alone, mirroring `.plans/auth/OPEN.md`. When one is settled and built, move the outcome to
`../DECISIONS.md` and delete it here.

## 1. Cooperative / farmer-group entity shape

**Raised** 18 Sep 2026 (FARM-25). Needed for the listings dashboard itself — "248 farmers / 37
active listings" only means something once membership exists somewhere.

**Decision so far:** a `cooperatives` collection, one document per coordinator's group:

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `coordinatorId` | string → `users._id` | The owning coordinator. |
| `name` | string | |
| `district` | string, matches `listings.districtKey` convention | So membership and listings filter the same way. |
| `memberFarmerIds` | string[] → `users._id` | The join, kept as an array on the cooperative side. |

Rejected: a `cooperativeId` field on `users` instead. That makes cooperative membership a write a
coordination action makes onto another domain's collection — the same boundary problem orders
avoids by keeping its own collection rather than writing onto listings.

Not chosen now, but the upgrade path if it's ever needed: a join collection
(`cooperative_memberships`) instead of an array, the moment a farmer needs to belong to more than
one cooperative, or membership needs its own metadata (joined date). Nothing today needs that.

**Recommended:** build the array version now.

## 2. Aggregated dashboard stats — live query, not a cached read-model

**Raised** 18 Sep 2026 (FARM-25). The dashboard's counts (farmers, active listings, to-approve,
disputes) could be denormalised/cached or computed on request.

**Decision so far:** compute live — query `cooperatives.memberFarmerIds`, then `listings` through
catalog's exported `LISTING_REPOSITORY` port, and `users.status`. No new collection, no cache.

Why: the dataset is coursework-scale, not production-scale. A cached read-model is exactly the
premature optimisation `CLAUDE.md` says to avoid. Revisit only if an actual perf problem shows up.

## 3. Benchmark price: a real collection, owned by `coordination`

**Raised** 18 Sep 2026. `.plans/DATA-MODEL.md` already names this as the trigger for `CROPS`
gaining a table — but only the *price* needs to move; crop identity stays the shared constant
(`.plans/DECISIONS.md`, "Crops are a shared constant").

**Decision so far:** a `benchmark_prices` collection:

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `cropId` | enum `CropId` | |
| `district` | string | |
| `lowPricePerKg`, `highPricePerKg` | number ≥ 0 | |
| `source` | enum `manual`, `regional_index` | |
| `setByCoordinatorId` | string → `users._id` | |
| `publishedAt` | Date | |

One current document per `(cropId, district)` — a later publish overwrites, no history kept, same
as orders not keeping a listing's price history beyond its own snapshot. An audit trail is a cheap
later addition (`timestamps: true` plus an append-only collection), not modelled now.

**Not part of FARM-25** (that ticket is the listings dashboard specifically). Recorded now so the
next coordination story doesn't re-derive the shape. **Not yet built.**

## 4. Batching: coordination decides, logistics executes

**Raised** 18 Sep 2026. `coordination`'s own README already claims "batching sales onto shared
transport" as one of its checkpoints; `.plans/STRUCTURE.md` gives `logistics` "pickup, routing,
maps, delivery tracking."

**Decision so far:** `coordination` owns a `Batch` entity — the decision of which confirmed
orders/listings get grouped into one shared-transport slot, and the batch's status. `logistics`
owns everything downstream of an existing batch: route optimisation, driver assignment execution,
tracking. `logistics` would export a port (e.g. an `assignDriverToBatch` use-case) that
`coordination` calls — matching the one-way dependency rule in `.plans/PLAYBOOK.md` (catalog
exports `LISTING_REPOSITORY` for orders; dependencies point one way).

**Not part of FARM-25. Not yet built** — `logistics` is still an empty scaffold, so this is a
boundary decision, not an implementation.

## 5. Farmer listing approval: a coordination action, catalog stays the data owner

**Raised** 18 Sep 2026. Both `.plans/PRODUCT.md` and this domain's README describe a coordinator
approval gate before a listing reaches buyers; catalog's `ListingStatus` already has
`pending_approval` → `verified`/`rejected`.

**Decision so far:** `coordination` exposes the approval endpoint, guarded by `farmers:approve`
(already reserved in the permission matrix per `coordination/README.md`), and calls catalog's
exported `LISTING_REPOSITORY` port to flip the listing's status. No new collection. `catalog` keeps
owning the `listings` schema; `coordination` owns only the decision to change it — the same split
as batching, above.

**Worth knowing alongside this:** `.plans/auth/OPEN.md` #1 raises a related but distinct and more
urgent question — coordinator *account* self-registration (not farmer/listing approval) is a
privilege-escalation gap. Not this domain's problem to fix, but the two approval flows sit next to
each other and are easy to conflate. Flagged here so fixing one is never assumed to close the
other.
