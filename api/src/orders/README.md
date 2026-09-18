# Orders domain

**Owns:** a deal between one buyer and one farmer about one listing: quantity, the price at the
moment it was placed, and where it is in its life.

Built in FARM-35 from the buyer's side: place, list, view, cancel. Farmer acceptance, delivery
and payment are later stories that add statuses and use-cases here.

## Lifecycle

```
requested ──farmer──▶ accepted ──▶ open ──▶ assigned ──▶ in_transit ──▶ delivered
    │
    ├──farmer──▶ declined
    └──buyer───▶ cancelled        (only while `requested`)
```

The team's data model started an order at `open`. The product doc says a buyer *requests* and a
farmer *accepts or negotiates*, so `requested`, `accepted` and `declined` sit in front of it. The
enum in `packages/shared/src/orders/order.ts` already lists every later state so it does not have
to change under whoever writes them.

**Placing an order does not change the listing's quantity.** Only a farmer accepting should, and
that is theirs to write. Until then several buyers may request the same kilos.

**One line per order.** Every workflow in the research is one crop, one listing, one order. If
multi-item orders are ever wanted, add `items[]` beside these fields then.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/order.ts` (`Order`, `toOrderDto`) and `repositories/order.repository.ts` (interface + `ORDER_REPOSITORY`). | `packages/shared` |
| `application/` | `services/` — `PlaceOrder`, `ListMyOrders`, `GetOrder`, `CancelOrder`; `errors.ts` — `OrderError`. `PlaceOrder` takes the catalog's `ListingRepository` port: the one cross-domain dependency, and it points one way (orders → catalog). | `domain/`, `catalog/domain` |
| `infrastructure/persistence/` | Mongoose schema for `orders`, the Mongoose repository, an in-memory one for tests. | `domain/` |
| `orders.controller.ts` / `orders.module.ts` | As in every domain. `mine` is routed before `:id`. | |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| POST | `/orders` | `order:place` (buyer) | 201 `Order` in `requested`; 404 `listing_not_found`; 409 `listing_unavailable`; 400 `quantity_out_of_range` |
| GET | `/orders/mine` | `order:read-own` | 200 `Order[]` — the caller's orders as buyer, newest first |
| GET | `/orders/:id` | `order:read-own` | 200 `Order` for its buyer or its farmer; 403 `not_your_order`; 404 `order_not_found` |
| POST | `/orders/:id/cancel` | `order:cancel` (buyer) | 200 `Order` in `cancelled`; 403; 409 `order_not_cancellable` |

The client sends only `{ listingId, quantityKg, note? }`. Price, farmer and crop are copied from
the listing on the server, so a later price change does not rewrite history and a client cannot
name its own price. The quantity must be between the listing's `minOrderKg` and its `quantityKg`.

## Flow

`POST /orders`, from the tap to the row, in the order the files run. Every endpoint in every
domain follows this same path; only the names change.

| Step | File | What happens |
| ---- | ---- | ------------ |
| 1 | `mobile/src/app/listing/[id].tsx` | The Place order sheet parses the form with `placeOrderSchema` and calls `ordersApi.place(token, input)`. |
| 2 | `mobile/src/features/orders/api.ts` | `apiFetch("/orders", { method: "POST", body, token, schema: orderSchema })`. |
| 3 | `identity/auth/jwt-auth.guard.ts`, `roles.guard.ts` | The token is verified; `@Allow('order:place')` is checked against the shared matrix. 401 / 403 stop here. |
| 4 | `orders.controller.ts` | `ZodValidationPipe(placeOrderSchema)` rejects a bad body with 400 `validation_error`; `@CurrentUser()` supplies the buyer id. |
| 5 | `application/services/place-order.ts` | Loads the listing through the catalog port, refuses if missing (`not_found`), not `verified` (`conflict`) or out of range (`invalid`); copies price, farmer and crop; total is computed. |
| 6 | `infrastructure/persistence/mongoose-order.repository.ts` | Writes the `orders` document in `requested`; `toOrder` maps it back to the entity. |
| 7 | `domain/entities/order.ts` | `toOrderDto` shapes the response; the controller returns 201. |
| — | `shared/http/domain-error.filter.ts` | Any `OrderError` thrown in step 5 becomes `{ code, message }` with the status its `kind` maps to. |
| 8 | back in the app | `apiFetch` validates the body with `orderSchema`; the screen `router.replace`s to the order; the list reloads on focus. |

Cancel is the same path with `CancelOrder`, which refuses unless the caller is the buyer
(`forbidden`) and the status is `requested` (`conflict`).

## Reuse points

- **`ORDER_REPOSITORY`** (`domain/repositories/order.repository.ts`) is the port farmer
  acceptance, delivery and payment stories should extend with new methods, not bypass.
- The status enum and `ACTIVE_ORDER_STATUSES` come from `packages/shared/src/orders/order.ts`;
  the app colours them through `OrderStatusPill`. Add a state there, and both sides know it.
- Unit tests: `application/services/orders.spec.ts` over `InMemoryOrderRepository` and the catalog's
  in-memory listing repository. E2e: `api/test/orders.e2e-spec.ts`.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
