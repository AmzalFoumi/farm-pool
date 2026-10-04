# Payments domain

**Owns:** the money on a deal — the escrow record for one order: what the buyer paid, what has
been released to the farmer, and what is still held.

**No real money moves.** The only `PaymentGateway` is `SimulatedPaymentGateway`, which approves
every charge. Everything around it — who may pay, when, the split, the release — is real. Why:
`.plans/DECISIONS.md`, "Payments".

Built in FARM-41: pay, and read. Releasing the balance on receipt (FARM-51) and adjusting for a
renegotiated price (FARM-53) add use-cases here.

## Lifecycle

```
order `accepted` ──buyer pays──▶ payment `in_escrow`     the order becomes `open`
                                   │  deposit         100% from the buyer
                                   │  advance_release  30% to the farmer, at once
                                   ▼
order `delivered` ──buyer confirms receipt──▶ payment `released`   (FARM-51)
                                      balance_release  the held 70% to the farmer
```

**Paying is what moves an order from `accepted` to `open`.** The driver job board reads `open`
only, so a driver is never offered a trip for produce nobody has paid for.

**One payment per order, enforced by a unique index on `orderId`**, not by a check in a use-case.
Two taps on Pay produce one payment and one `already_paid`.

**The buyer pays the whole total once.** `ADVANCE_RATE` (30%) in `packages/shared` decides the
split; the held part is the remainder, so the two always add back up to the total.

**Entries are append-only.** Each movement of money is one entry with its own receipt number. A
receipt is those entries read back in order; there is no second stored document to disagree.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/payment.ts` (`Payment`, `newEntry`, `toPaymentDto`), `repositories/payment.repository.ts` (interface + `PAYMENT_REPOSITORY`), `gateways/payment-gateway.ts` (interface + `PAYMENT_GATEWAY`). | `packages/shared` |
| `application/` | `services/` — `PayForOrder`, `GetPayment`; `errors.ts` — `PaymentError`. `PayForOrder` takes the orders domain's `OrderRepository` port: the one cross-domain dependency, and it points one way (payments → orders). | `domain/`, `orders/domain` |
| `infrastructure/` | `persistence/` — Mongoose schema for `payments`, the Mongoose repository, an in-memory one for tests. `gateway/` — `SimulatedPaymentGateway`. | `domain/` |
| `payments.controller.ts` / `payments.module.ts` | As in every domain. | |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| POST | `/payments/orders/:orderId/pay` | `payment:pay` (buyer) | 201 `Payment` in `in_escrow`, order now `open`; 403 `not_your_order`; 404 `order_not_found`; 409 `order_not_payable` / `already_paid` |
| GET | `/payments/orders/:orderId` | `payment:read-own` | 200 `Payment` for its buyer or its farmer; 403 `not_your_order`; 404 `payment_not_found` |

Every route is keyed by the order. Pay takes no body: the amount is the order's own total, so a
client cannot name what it pays any more than it can name its price.

## Flow

`POST /payments/orders/:orderId/pay`, in the order the files run.

| Step | File | What happens |
| ---- | ---- | ------------ |
| 1 | `mobile/src/features/payments/api.ts` | `paymentsApi.pay(token, orderId)` through `apiFetch`, validated with `paymentSchema`. |
| 2 | `identity/auth/jwt-auth.guard.ts`, `roles.guard.ts` | The token is verified; `@Allow('payment:pay')` is checked against the shared matrix. |
| 3 | `payments.controller.ts` | `@CurrentUser()` supplies the buyer id. |
| 4 | `application/services/pay-for-order.ts` | Loads the order through the orders port. Refuses if missing, not the caller's, already paid, or not `accepted`. Charges the gateway, splits the total, writes the payment with its first two entries. |
| 5 | `orders/.../mongoose-order.repository.ts` | `markPaid` moves the order `accepted` → `open`, matching buyer and status in one operation. If it finds nothing, step 4's payment is removed and the request is refused. |
| 6 | `domain/entities/payment.ts` | `toPaymentDto` shapes the response; `gatewayRef` is left out. |

## Reuse points

- **`PAYMENT_GATEWAY`** — a real provider is one class implementing `PaymentGateway` and one line
  in `payments.module.ts`.
- **`PAYMENT_REPOSITORY`** — extend it with new methods; do not write to `payments` from another
  domain.
- **`newEntry(kind, amount, at)`** — every money movement goes through it, so every one gets a
  receipt number.
- Unit tests: `application/services/payments.spec.ts` over the in-memory repositories. E2e:
  `api/test/payments.e2e-spec.ts`, which also proves a paid order reaches the driver job board.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the `identity`
domain. Two of them act in this domain; neither *is* this domain.
