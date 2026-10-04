# Plan: escrow payments, receipt confirmation, receipts and renegotiation

Covers FARM-41, FARM-51, FARM-48 and FARM-53, on one branch (`feat/FARM-41-escrow-payments`) and
one pull request, split into one commit per concern. The checklist at the bottom is ticked as the
work lands.

## Context

**Why.** A buyer does not want to pay a farmer they have never met, and a farmer does not trust
digital payment without proof. The product answer is *escrow*: the app holds the buyer's money,
gives the farmer a part straight away, and gives the rest only when the buyer says the goods
arrived (`.plans/PRODUCT.md`, "Payment").

**Where the code stood.** An order goes
`requested → accepted → open → assigned → in_transit → delivered`. The buyer's steps and the
driver's steps were built; nothing wrote `accepted` or `open`. `accepted` belongs to FARM-46
(farmer accepts or declines). There was no payment code, no collection and no chosen provider.

**Decisions taken for this work.** Simulated money, no real provider. The buyer pays the full
total once; 30% goes to the farmer at once, 70% is held.

**The outcome.** Payment is the missing step between `accepted` and `open`: paying is what makes
an order visible to drivers. This keeps the product rule that a driver is never offered stock
nobody has paid for.

## Design in one picture

```
requested ─farmer(FARM-46)─▶ accepted ─BUYER PAYS (FARM-41)─▶ open ─▶ assigned ─▶ in_transit ─▶ delivered
                                         │ payment created                                        │
                                         │ 30% advance → farmer                 BUYER CONFIRMS RECEIPT (FARM-51)
                                         │ 70% held                              70% balance → farmer
                                         └─ receipt (FARM-48)                    └─ receipt (FARM-48)
        price proposal allowed while accepted / open / assigned (FARM-53) — adjusts the held 70%
```

### Choices built into this plan

1. **A new api domain, `payments`** (`api/src/payments/`). Money is its own capability, not part
   of `orders`. It depends on `orders` one way, through the existing `ORDER_REPOSITORY` port.
2. **One new collection, `payments`**: one document per order (unique index on `orderId`, so an
   order cannot be paid twice). It holds the current position (`total`, `advanceAmount`,
   `heldAmount`, `status`) and `entries[]`, one per movement of money.
3. **The simulation sits behind one small interface**, `PaymentGateway`. Swapping in a real
   provider later is one class. Same idea as the driver SMS stub.
4. **`ADVANCE_RATE = 0.3`** is a constant in `packages/shared`, so the app and the api show and
   compute the same split.
5. **No new order status.** Buyer confirmation is stored as `receivedAt` on the order, and the
   payment's `status` says whether money was released. A status such as `completed` would force
   edits in the logistics code and the status pill for no gain.
6. **A receipt is not a stored document.** It is the payment's entries shown as plain sentences.
   Each entry carries a `receiptNo` so it can be quoted in a dispute.
7. **Renegotiation is one pending proposal stored on the order** (`priceProposal`). Either side
   proposes; the other side accepts or declines. Allowed only before pickup. On accept, the
   order's price and total change, and if money is already held the difference is recorded as a
   `top_up` or a `refund`. A proposal whose new total is below the advance already given to the
   farmer is refused.

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| POST | `/payments/orders/:orderId/pay` | `payment:pay` | 201 `Payment`; order becomes `open` |
| GET | `/payments/orders/:orderId` | `payment:read-own` | 200 `Payment` for its buyer or farmer |
| POST | `/payments/orders/:orderId/confirm-receipt` | `order:confirm-receipt` | 200 `Payment` in `released` |
| POST | `/payments/orders/:orderId/price-proposal` | `order:renegotiate` | 200 `Order` with the proposal |
| POST | `/payments/orders/:orderId/price-proposal/accept` · `/decline` | `order:renegotiate` | 200 `Order` |

## Risks to know

- **FARM-46 dependency.** Until farmer acceptance is merged, no order can reach `accepted` in the
  running app, so the Pay button cannot be reached by hand. Automated tests are not affected.
  **FARM-46's accept must stop at `accepted`**; if it moved an order straight to `open`, it would
  skip payment.
- **The farmer has no order list yet** (`farmer-orders.tsx` is a placeholder, also FARM-46). The
  farmer sees the payment and receipt on the order screen once that list links to it.
- **`collectedKg` can differ from the ordered quantity.** This work releases the agreed balance
  and does not auto-adjust for a short load; that is a dispute (FARM-42 / FARM-56).
- **The e2e suites are flaky when run in parallel** (they share one in-memory database). Run them
  with `npx jest --config ./test/jest-e2e.json --runInBand` from `api/` for a stable result.

## Checklist

**Setup**
- [x] Branch `feat/FARM-41-escrow-payments` created from up-to-date `main`
- [x] Plan saved to `.plans/payments/PLAN.md`
- [ ] FARM-46 owner told: accept must stop at `accepted`, payment moves it to `open`

**Gate 1 — shared (FARM-41)**
- [x] `payments/payment.ts`: schemas, `ADVANCE_RATE`, `splitTotal`
- [x] `orderSchema`: `receivedAt`, `priceProposal`
- [x] Four new permissions; exported from `index.ts`; shared rebuilt

**Gate 2 — api pay + read (FARM-41)**
- [x] `ORDER_REPOSITORY.markPaid` in the interface, Mongoose and in-memory repositories
- [x] `payments` domain: entity, repository, gateway port, simulated gateway, schema
- [x] `PayForOrder`, `GetPayment`, `PaymentError`, controller, module, `app.module.ts`
- [x] Unit tests and e2e tests pass (including: paid order appears on the driver job board)
- [x] `api/src/payments/README.md`

**Gate 3 — mobile pay (FARM-41)**
- [x] `features/payments/api.ts`, `pay-sheet.tsx`, `payment-card.tsx`, `PaymentStatusPill`
- [x] Order screen: "Pay Rs X" for the buyer on an `accepted` order
- [x] Dev-only seed for an `accepted` order: `npm run seed:demo-order -w api`
- [x] `tsc` and lint clean on the changed files; tap targets 48dp
- [x] Seen running on an Android emulator, in light and dark mode (see "Seen running")

**Gate 4 — confirm receipt (FARM-51)**
- [x] `ORDER_REPOSITORY.markReceived`; `ConfirmReceipt` use-case and endpoint; tests
- [x] Order screen: "Confirm I received it" on a `delivered` order; card shows released

**Gate 5 — receipt (FARM-48)**
- [x] `app/receipt/[orderId].tsx`, registered in `_layout.tsx`; buyer and farmer wording
- [x] Opens straight after paying and after confirming; "View receipt" row on the order screen

**Gate 6 — renegotiation (FARM-53)**
- [x] `setPriceProposal` / `resolvePriceProposal`; `ProposePrice`, `RespondToPriceProposal`; tests
- [x] Held amount adjusted with a `top_up` or `refund` entry when money is already in escrow
- [x] `price-proposal-card.tsx` on the order screen

**Gate 7 — docs**
- [x] `DECISIONS.md`, `DATA-MODEL.md`, `auth/README.md`, `orders/README.md`

## Seen running

Walked on an Android emulator (development build) on 4 October 2026, against a local throwaway
database, as the seed buyer:

- the accepted order shows "Pay Rs 18,000"; the sheet shows Rs 5,400 now and Rs 12,600 held
- paying opens the receipt with two entries; the order then shows "Open" and the payment card
- proposing Rs 200 / kg shows the waiting card with Withdraw; after the farmer accepts, the
  total is Rs 20,000 and the receipt gains "You added Rs 2,000 because the price went up"
- after the driver delivers, "Confirm I received it" opens the sheet, which states the amount
  and the 100 kg ordered against the 95 kg collected; confirming opens the receipt at
  "Paid in full", Rs 0 held; a second confirm is refused with `already_released`
- the order screen and the receipt in dark mode

Then as the seed farmer, opening the order by link (there is no farmer order list until FARM-46):

- an accepted, unpaid order shows "You accepted. A driver is booked once the buyer pays." and no
  Pay button
- a paid order shows the payment card in the farmer's words ("Buyer paid", "Paid to you",
  "Rs 12,600 is held for you…")
- a buyer's proposal of Rs 160 / kg shows with its reason, Accept and Decline. Decline removed
  it and changed nothing; Accept made the total Rs 16,000 and the held amount Rs 10,600
- the farmer's receipt reads "The buyer paid…", "You received Rs 5,400 as an advance.",
  "Rs 2,000 was returned to the buyer because the price went down."

And the pay sheet and the confirm-receipt sheet in dark mode, as the buyer.

**Not seen:** the farmer's receipt after the balance is released, anything in Sinhala or Tamil,
and the browser build, which does not load at all
(`Unable to resolve module …/rndevtools/ReactDevToolsSettingsManager`, cause not found).

**Found on the way, in shared components rather than in this work:** in dark mode the back
arrow in `AppBar` is invisible, and the label of `AppButton`'s `outline` variant ("Not yet",
"Decline", "Withdraw", "Cancel") is dark green on a dark card and hard to read.

## Verification

1. `npm run build -w @farm-pool/shared` — rebuilds the shared package so the api sees new types.
2. `npm test -w api` — unit tests over the in-memory repositories.
3. From `api/`: `npx jest --config ./test/jest-e2e.json --runInBand` — real HTTP against an
   in-memory database, every refusal in the endpoint table.
4. `npx tsc --noEmit -p mobile` and `npm run lint -w mobile`.
5. By hand in the app (done once, see "Seen running"): buyer pays an accepted order → receipt opens → order shows "Open" and the
   escrow card; driver accepts, picks up, delivers; buyer taps "Confirm I received it" → payment
   shows released. Then a price proposal from each side. Repeat the screens in dark mode.
