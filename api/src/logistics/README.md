# Logistics domain

**Owns:** pickup, routing, maps, delivery assignment and tracking, and the driver verification a
farmer sees before handing over produce.

**Built: the driver job board and accept (FARM-49/54, LP-20 … LP-24).** Routing, batching,
pickup/drop-off confirmation and the return leg are still unbuilt.

**This domain owns no collection.** A job is not a stored record — it is an order that reached
`open`, read together with the listing it was placed against. LP-21 forbids a job existing without
a confirmed order, and the cheapest way to guarantee that is to have nothing to keep in sync. See
`domain/entities/job.ts`, which is mappers rather than state.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/`, `value-objects/`, and `repositories/` (**interfaces only**, each with its Symbol token). Pure business rules; ESLint rejects a `@nestjs/*` or `mongoose` import here. | `packages/shared` |
| `application/` | `services/` — one use-case class per verb; `errors.ts` — `LogisticsError extends DomainError` with stable codes. Request and response shapes are zod schemas in `packages/shared`, not DTO classes. | `domain/`, `shared/kernel`, possibly `orders/domain` (one way) |
| `infrastructure/persistence/` | Mongoose schema(s), the Mongoose repository, an in-memory repository for unit tests. | `domain/` |
| `logistics.controller.ts` | HTTP handlers: `@Allow(action)` → `ZodValidationPipe(schema)` → one use-case → return. | `application/` |
| `logistics.module.ts` | `MongooseModule.forFeature`, ports bound with `useClass`, use-cases built with `useFactory`. | all of the above |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| GET | `/logistics/jobs` | `delivery:read-jobs` | 200 `JobSummary[]` — open jobs in the caller's district their vehicle can carry; 409 `no_vehicle` |
| GET | `/logistics/jobs/mine` | `delivery:read-jobs` | 200 `JobSummary[]` — jobs this driver holds, newest first |
| GET | `/logistics/jobs/:orderId` | `delivery:read-jobs` | 200 `JobDetail`; 403 `not_your_job`; 404 `job_not_found` |
| POST | `/logistics/jobs/:orderId/accept` | `delivery:accept` | 200 `JobDetail` in `assigned`; 409 `job_taken` / `load_too_heavy` / `no_vehicle`; 404 |
| GET | `/logistics/orders/:orderId/driver` | `delivery:read-driver` | 200 `AssignedDriver`; 403 `not_your_job`; 404 `no_driver_assigned` |

No endpoint takes a body, so there is no `ZodValidationPipe` anywhere here: a job is identified by
its order and claimed by the caller's own token.

### Two rules worth knowing before you change anything

**The farmer's phone number is attached only to a job its caller holds.** An open job on the board
is readable by every driver — that is what makes it a board — and carries no contact details, so
the endpoint cannot be walked to harvest farmers' numbers. The decision lives in `GetJob` and
nowhere else; `toJobDetail` takes the contact as an argument rather than deriving it, so a mapper
cannot start leaking one by accident.

**Accepting is an atomic claim, not read-then-write.** `ORDER_REPOSITORY.assignDriver` matches on
`status: 'open'` and updates in one operation, so two drivers tapping Accept in the same second
produce one winner and one `job_taken`. Being quietly handed a job another driver is already
driving to is the outcome this is engineered against.

**Verification is deliberately not checked on accept.** Nothing moves a driver past `pending`
yet (`docs/logistics-driver-role.md`, open question 3), so gating on `verified` would mean no
driver could accept anything at all. `AcceptJob` names the line that changes when that question is
answered, and a unit test pins the current behaviour.

## What already exists that this domain will touch

- The order lifecycle declares `open → assigned → in_transit → delivered`
  (`packages/shared/src/orders/order.ts`, `api/src/orders/README.md`). Moving an order through
  those states goes through the orders domain's `ORDER_REPOSITORY`; do not write to the `orders`
  collection from here. `open → assigned` is written by `AcceptJob`; `in_transit` and `delivered`
  are the next story's (LP-50/52).
- The Map and Calls tabs in the app are placeholders (`PlaceholderScreen`); they are where pickup
  and tracking screens go.
- Nothing about depots, vehicles or drivers is stored yet (`.plans/DATA-MODEL.md`, "Not modelled
  yet").

## Reuse points

- **`domain/entities/job.ts`** — `toJobSummary` / `toJobDetail` / `toPickupContact` /
  `toAssignedDriver`. A batching or routing story shapes its responses through these, so a job
  looks the same wherever it is read.
- **`ORDER_REPOSITORY.assignDriver`** is the pattern for every later lifecycle move: filter on the
  status you require, update in the same operation, return `null` when the filter missed.
- Unit tests: `application/services/jobs.spec.ts`, over the in-memory order, listing and user
  repositories — no database, no Nest container.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
