# Coordination domain

**Owns:** farmer groups and cooperatives, the aggregated supply a coordinator represents, and the
coordinator's checkpoints: approving a new farmer's listing, batching sales onto shared
transport, benchmark prices per crop.

**Not built yet.** The folders below are an empty scaffold (`.gitkeep` files) and the module is
registered in `app.module.ts` with no providers. The first story here follows
`.plans/PLAYBOOK.md`, recipe 1, copying from `api/src/catalog/`.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/`, `value-objects/`, and `repositories/` (**interfaces only**, each with its Symbol token). Pure business rules; ESLint rejects a `@nestjs/*` or `mongoose` import here. | `packages/shared` |
| `application/` | `services/` — one use-case class per verb; `errors.ts` — `CoordinationError extends DomainError` with stable codes. Request and response shapes are zod schemas in `packages/shared`, not DTO classes. | `domain/`, `shared/kernel` |
| `infrastructure/persistence/` | Mongoose schema(s), the Mongoose repository, an in-memory repository for unit tests. | `domain/` |
| `coordination.controller.ts` | HTTP handlers: `@Allow(action)` → `ZodValidationPipe(schema)` → one use-case → return. | `application/` |
| `coordination.module.ts` | `MongooseModule.forFeature`, ports bound with `useClass`, use-cases built with `useFactory`. | all of the above |

## Endpoints

None yet. Actions already reserved in the permission matrix for this domain: `users:list` and
`farmers:approve` (coordinator only). `GET /identity/users` is served by `identity` today.

## What already exists that this domain will touch

- Listings carry a `status` of `draft` / `pending_approval` / `verified` / `rejected` / `sold`
  (`.plans/DATA-MODEL.md`); approval is a status change through the catalog's
  `LISTING_REPOSITORY`, not a new collection.
- Users carry `status: pending_review` for the farmer-vetting gate; no guard reads it yet
  (`.plans/auth/README.md`).
- Crops are a shared constant; per-crop benchmark prices are the moment they become a collection
  (`.plans/DECISIONS.md`).

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
