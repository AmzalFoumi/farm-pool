# Payments domain

**Owns:** the money on a deal — the escrow record for one order: what the buyer paid, what has
been released to the farmer, and what is still held.

**No real money moves.** The only `PaymentGateway` is `SimulatedPaymentGateway`, which approves
every charge. Everything around it — who may pay, when, the split, the release — is real. Why:
`.plans/DECISIONS.md`, "Payments".

Built in FARM-41 (pay, read), FARM-51 (release the balance on receipt) and FARM-53 (renegotiate
the price before pickup). FARM-48's receipt is the `entries` of a payment, rendered by the app.

## Lifecycle

```
order `accepted` ──buyer pays──▶ payment `in_escrow`     the order becomes `open`
                                   │  deposit         100% from the buyer
                                   │  advance_release  30% to the farmer, at once
                                   ▼
order `delivered` ──buyer confirms receipt──▶ payment `released`
                                      balance_release  whatever is still held, to the farmer
```

**Paying is what moves an order from `accepted` to `open`.** The driver job board reads `open`
only, so a driver is never offered a trip for produce nobody has paid for.

**One payment per order, enforced by a unique index on `orderId`**, not by a check in a use-case.
Two taps on Pay produce one payment and one `already_paid`.

**The buyer pays the whole total once.** `ADVANCE_RATE` (30%) in `packages/shared` decides the
split; the held part is the remainder, so the two always add back up to the total.

**Entries are append-only.** Each movement of money is one entry with its own receipt number. A
receipt is those entries read back in order; there is no second stored document to disagree.

**Confirming receipt releases once.** The release is the claim: it matches on `in_escrow` and on
the amount that was read, so it can happen once. The order is stamped `receivedAt` after it. If
the stamp fails, the next confirmation finds the payment released and the order unstamped, and
finishes the stamp instead of refusing. The sum released is the agreed balance; it is not reduced
for a short load (`collectedKg`) — that is a dispute.

**A renegotiated price moves only the held part.** Either side proposes; the other accepts or
declines; one proposal at a time; only while the order is `accepted`, `open` or `assigned`. On
accept the order is repriced and the difference is a `top_up` from the buyer or a `refund` to
them. The advance is never taken back, so a new total below it is refused (`price_too_low`).

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/payment.ts` (`Payment`, `newEntry`, `toPaymentDto`), `repositories/payment.repository.ts` (interface + `PAYMENT_REPOSITORY`), `gateways/payment-gateway.ts` (interface + `PAYMENT_GATEWAY`). | `packages/shared` |
| `application/` | `services/` — `PayForOrder`, `GetPayment`, `ConfirmReceipt`, `ProposePrice`, `RespondToPriceProposal`; `errors.ts` — `PaymentError`. Each takes the orders domain's `OrderRepository` port: the one cross-domain dependency, and it points one way (payments → orders). | `domain/`, `orders/domain` |
| `infrastructure/` | `persistence/` — Mongoose schema for `payments`, the Mongoose repository, an in-memory one for tests. `gateway/` — `SimulatedPaymentGateway`. | `domain/` |
| `payments.controller.ts` / `payments.module.ts` | As in every domain. | |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| POST | `/payments/orders/:orderId/pay` | `payment:pay` (buyer) | 201 `Payment` in `in_escrow`, order now `open`; 403 `not_your_order`; 404 `order_not_found`; 409 `order_not_payable` / `already_paid` |
| GET | `/payments/orders/:orderId` | `payment:read-own` | 200 `Payment` for its buyer or its farmer; 403 `not_your_order`; 404 `payment_not_found` |
| POST | `/payments/orders/:orderId/confirm-receipt` | `order:confirm-receipt` (buyer) | 200 `Payment` in `released`; 403 `not_your_order`; 404 `payment_not_found`; 409 `not_delivered_yet` / `already_released` |
| POST | `/payments/orders/:orderId/price-proposal` | `order:renegotiate` (buyer, farmer) | 200 `Order` carrying the proposal; 400 `price_unchanged` / `price_too_low`; 403 `not_your_order`; 409 `proposal_not_allowed` / `proposal_pending` |
| POST | `/payments/orders/:orderId/price-proposal/accept` | `order:renegotiate` | 200 `Order` repriced; 403 `own_proposal`; 409 `no_open_proposal` / `proposal_not_allowed` |
| POST | `/payments/orders/:orderId/price-proposal/decline` | `order:renegotiate` | 200 `Order` unchanged, proposal removed (also how the proposer withdraws); 409 `no_open_proposal` |

The proposal routes return the `Order`, not the `Payment`: the proposal lives on the order.

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
