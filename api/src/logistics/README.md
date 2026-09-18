# Logistics domain

**Owns:** pickup, routing, maps, delivery assignment and tracking, and the driver verification a
farmer sees before handing over produce.

**Not built yet.** The folders below are an empty scaffold (`.gitkeep` files) and the module is
registered in `app.module.ts` with no providers. The first story here follows
`.plans/PLAYBOOK.md`, recipe 1, copying from `api/src/orders/` (which already has the states this
domain will drive).

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/`, `value-objects/`, and `repositories/` (**interfaces only**, each with its Symbol token). Pure business rules; ESLint rejects a `@nestjs/*` or `mongoose` import here. | `packages/shared` |
| `application/` | `services/` — one use-case class per verb; `errors.ts` — `LogisticsError extends DomainError` with stable codes. Request and response shapes are zod schemas in `packages/shared`, not DTO classes. | `domain/`, `shared/kernel`, possibly `orders/domain` (one way) |
| `infrastructure/persistence/` | Mongoose schema(s), the Mongoose repository, an in-memory repository for unit tests. | `domain/` |
| `logistics.controller.ts` | HTTP handlers: `@Allow(action)` → `ZodValidationPipe(schema)` → one use-case → return. | `application/` |
| `logistics.module.ts` | `MongooseModule.forFeature`, ports bound with `useClass`, use-cases built with `useFactory`. | all of the above |

## Endpoints

None yet. The action already reserved in the permission matrix: `delivery:accept` (role
`logistics`, labelled "Delivery partner" in the app).

## What already exists that this domain will touch

- The order lifecycle already declares `open → assigned → in_transit → delivered`
  (`packages/shared/src/orders/order.ts`, `api/src/orders/README.md`). Moving an order through
  those states goes through the orders domain's `ORDER_REPOSITORY`; do not write to the `orders`
  collection from here.
- The Map and Calls tabs in the app are placeholders (`PlaceholderScreen`); they are where pickup
  and tracking screens go.
- Nothing about depots, vehicles or drivers is stored yet (`.plans/DATA-MODEL.md`, "Not modelled
  yet").

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
