# Offers domain

**Owns:** a negotiation between one buyer and one farmer about one listing, before an order
exists: the price and quantity currently on the table, whose turn it is, and every counter made
so far.

Built in FARM-46. When an offer is accepted it becomes an order (`api/src/orders/README.md`), and
from there on the orders and payments domains take over.

This is not the same as price renegotiation (FARM-53, `api/src/payments/README.md`). That one
changes the price of an order that already exists, after acceptance and before pickup. This one
agrees the deal in the first place.

## Lifecycle

```
PENDING ──counter──▶ NEGOTIATING ──counter (repeats)──▶ NEGOTIATING
   │                      │
   ├──────accept──────────┴──▶ ACCEPTED   (an order is created, status `accepted`)
   └──────decline─────────────▶ DECLINED
```

Each counter overwrites the current `pricePerKg` / `quantityKg` / `note`, appends to
`negotiationHistory`, and passes the turn (`actionRequiredBy`) to the other side.

**The order an accepted offer creates starts at `accepted`**, which means "agreed, waiting for
the buyer to pay". Paying moves it to `open` and onto the driver job board (FARM-41). It must not
be created as `open`: that would skip payment.

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| GET | `/offers/listing/:listingId` | `listing:read` | 200 `Offer[]` — the offers on that listing the caller is a side of |
| POST | `/offers` | `order:place` (buyer) | 201 `Offer` in `PENDING`; 409 when the listing is not `verified` |
| POST | `/offers/:id/negotiation` | `order:renegotiate` | `Offer` in `NEGOTIATING`; 403 `not_your_offer`; 400 when it is not the caller's turn |
| POST | `/offers/:id/accept` | `order:renegotiate` | `{ orderId }`; 403 `not_your_offer`; 400 when it is not the caller's turn; 409 when the stock is gone |
| POST | `/offers/:id/decline` | `order:renegotiate` | `Offer` in `DECLINED`; 403 `not_your_offer` |

Who is calling decides which side they are (`sideOf` in `domain/entities/offer.ts`). The
`senderType` field in the negotiation body is still accepted but is not trusted.

Accepting takes the offer's quantity off the listing in one database operation
(`ListingRepository.deductQuantity`), so two accepts cannot both sell the same stock. A listing
left with less than its `minOrderKg` becomes `sold`.

## Flow

`POST /offers/:id/accept`, in the order the files run:

| Step | File | What happens |
| ---- | ---- | ------------ |
| 1 | `offers.controller.ts` | `@Allow('order:renegotiate')`, then passes the caller's id and the offer id on. |
| 2 | `application/services/accept-offer.service.ts` | Loads the offer; refuses a caller who is on neither side, or whose turn it is not. Marks the offer `ACCEPTED`. |
| 3 | `catalog/.../mongoose-listing.repository.ts` | `deductQuantity` claims the stock, or resolves `null` and the offer is put back. |
| 4 | `orders/application/services/place-order.ts` | `executeFromOffer` creates the order at the negotiated price, status `accepted`. |
| 5 | `accept-offer.service.ts` | Writes the new `orderId` back onto the offer. |

## Reuse points

- `OFFER_REPOSITORY` (`domain/repositories/offer.repository.ts`). `save` guards on `version`, so a
  caller must add 1 to `offer.version` before saving; a concurrent write then fails with 409.
- Shared types and schemas: `packages/shared/src/orders/offer.ts`.
- App side: `mobile/src/features/offers/api.ts` and the farmer's offers screen
  `mobile/src/app/(farmer)/offers/[id].tsx`.

## Not done yet

- **No screen starts an offer.** The buyer's Place order still creates a plain `requested` order,
  which the farmer answers through `/orders/:id/accept` or `/decline`.
- **Offers on a buyer's "wanted" request do not work** (FARM-47): creating one needs
  `order:place`, which only buyers have, and accepting one looks the request up as a listing.
- Offers do not expire (`expire-offers.service.ts` is a note, not a job).
- The services import NestJS inside `application/`, which `npm run lint -w api` reports.
- No tests.
