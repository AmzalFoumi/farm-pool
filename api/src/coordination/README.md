# Coordination domain

**Owns:** farmer groups and cooperatives, the aggregated supply a coordinator represents, and the
coordinator's checkpoints: verifying a new farmer, approving a listing, batching sales onto shared
transport, benchmark prices per crop.

Built in FARM-25, starting from the cooperative dashboard. Batching, benchmark prices and disputes
are drawn in Figma but have no collection behind them yet — see `.plans/coordination/OPEN.md`.
Recipe: `.plans/PLAYBOOK.md`.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/` (`Cooperative`, its `toCooperativeDto` mapper) and `repositories/` (**interfaces only** — `CooperativeRepository`, with its injection symbol). No NestJS, no Mongoose; ESLint rejects it. | `packages/shared` |
| `application/` | `services/` — the use-cases (`GetCoordinatorDashboard`, `ListCooperativeFarmers`, `GetCoordinatorTasks`), plain constructor-injected classes; `errors.ts` — `CoordinationError`, a `DomainError` with stable codes. Request and response shapes are the zod schemas in `packages/shared`. | `domain/`, `shared/kernel` |
| `infrastructure/persistence/` | Mongoose schema for the `cooperatives` collection, the Mongoose repository, and an in-memory repository for unit tests. | `domain/` |
| `coordination.controller.ts` | HTTP handlers: `@Allow(action)` → one use-case → return. | `application/` |
| `coordination.module.ts` | `MongooseModule.forFeature`, imports `CatalogModule` and `IdentityModule` for their exported repositories, use-cases built with `useFactory`. | all of the above |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| GET | `/coordination/dashboard` | `cooperative:read-dashboard` (coordinator) | 200 `CoordinatorDashboard` — the cooperative, farmer count, verified listing count; 404 `cooperative_not_found` |
| GET | `/coordination/farmers` | `cooperative:read-farmers` (coordinator) | 200 `CooperativeFarmer[]` — every member, status, listing count, most-recent district; 404 `cooperative_not_found` |
| GET | `/coordination/tasks` | `cooperative:read-tasks` (coordinator) | 200 `CoordinatorTask[]` — farmers pending verification + listings pending approval; 404 `cooperative_not_found` |

Errors are `{ code, message }` via `DomainErrorFilter` (`src/shared/http`), registered once in
`app.module.ts`.

## Rules worth knowing

- **Every use-case here reads across domains, and it only ever reads.** `identity` exports
  `USER_REPOSITORY`, `catalog` exports `LISTING_REPOSITORY`; `coordination` imports both modules
  and injects the ports, the same one-way pattern `orders` uses for `catalog`. Nothing outside
  `coordination` imports from it — `coordination.module.ts` exports nothing yet.
- **A coordinator's cooperative is looked up by `findByCoordinatorId`, not assumed 1:1.** Every
  use-case takes the first result. See `.plans/coordination/OPEN.md` #1.
- **Tasks are read-only.** `GetCoordinatorTasks` shows farmers with `status: pending_review` and
  listings with `status: pending_approval` — there is no verify/approve endpoint yet
  (`.plans/coordination/OPEN.md` #5), so the app displays these, it does not act on them.
- **`ListingFilter` gained `farmerIds` and `ListingRepository` gained `findPendingApproval`** in
  `catalog`, specifically so this domain could query listings scoped to a cooperative without
  duplicating catalog's query logic. Both are additive — nothing in `catalog` had to change
  behaviour.

## Flow

`GET /coordination/tasks`, the shape every cross-domain read here follows:

| Step | File | What happens |
| ---- | ---- | ------------ |
| 1 | `mobile/src/app/(coordinator-tabs)/region.tsx` | `useRequest(() => coordinationApi.tasks(token), token)`; rendered inline in the "Needs you today" card, not `RequestView` (that's sized for a whole screen). |
| 2 | `mobile/src/features/coordination/api.ts` | `apiFetch("/coordination/tasks", { token, schema: coordinatorTaskListSchema })`. |
| 3 | `identity/auth/*` | Token verified; `@Allow('cooperative:read-tasks')` passes for `coordinator` only. |
| 4 | `coordination.controller.ts` | Calls `GetCoordinatorTasks` with the caller's id. |
| 5 | `application/services/get-coordinator-tasks.ts` | Looks up the cooperative, then reads pending farmers via `identity`'s `UserRepository` and pending listings via `catalog`'s `ListingRepository`, and merges both into one list. |
| 6 | back in the app | Each `CoordinatorTask` renders as a row — a name and "Verify", or a crop/quantity and "Approve" — both pills present, neither wired to an action. |

## Reuse points

Nothing exported yet — `coordination.module.ts`'s `exports` is empty. This domain is a consumer of
`catalog` and `identity`, not (yet) a provider to anyone else.

## Dev seed (temporary)

```
npm run seed:cooperatives -w api
```

Run `npm run seed:listings -w api` first (or alongside) so the dashboard has real listings to
count.

`src/cli/seed-cooperatives.ts` creates:

| Account | Phone | Status | Password |
| ------- | ----- | ------ | -------- |
| Coordinator — Priya Jayasinghe | `+94771000002` | `active` | `SEED_PASSWORD` or `longenough` |
| Farmer — Nimal Perera (same one `seed-listings.ts` creates) | `+94771000001` | `active` | same |
| Farmer — Kamala Silva | `+94771000003` | `active` | same |
| Farmer — Sunil Bandara | `+94771000004` | `active` | same |
| Farmer — Ranjith Fernando | `+94771000006` | `pending_review` | same |

...and upserts one `cooperatives` document (all five farmers as members) plus one
`pending_approval` listing for Nimal Perera, so `/coordination/tasks` has a real row of each kind
to show rather than only ever an empty state. Idempotent by `seedKey`; refuses to run with
`NODE_ENV=production`. Delete it when a real cooperative-creation flow ships.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
