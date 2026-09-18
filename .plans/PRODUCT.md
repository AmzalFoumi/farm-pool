# Product

What FarmPool is meant to do, for the people who will use it. This is a functional overview, not a
spec — it exists so a decision about a screen, a schema, or an API shape can be checked against an
actual user need instead of guessed at. Source: user interviews (one farmer, one coordinator, one
wholesaler, one logistics provider — Sri Lanka, semi-structured, 5–10 min each), the resulting
validated user flows and wireframes, and the product charter drawn up before development started.

## What the app is

FarmPool connects smallholder farmers directly to the people who buy their harvest — wholesale
buyers and, indirectly, the retail chain behind them — cutting out the chain of village
middlemen who each take a cut and delay payment. It is not a fully disintermediated marketplace:
a **coordinator** role (a cooperative or regional contact) stays in the loop to verify new
farmers, keep prices honest, batch shared transport, and mediate disputes. The bet is that
removing *unnecessary* markup layers while keeping one trusted human checkpoint is more workable,
for this user base, than a fully peer-to-peer design would be.

The target users are in rural Sri Lanka, often with low digital literacy, shared household
devices, and unreliable mobile networks — the design has to work for them specifically, not for a
generic smartphone user.

## User roles

**Farmer** — grows and sells produce. Wants to sell quickly before produce spoils, know the going
rate before agreeing a price, and not be at the mercy of a middleman's number. Interview subject
(20 years' farming) shares a basic Android device with family and relies on them for anything past
calls/texting — the design has to assume a device is a shared, low-capability object, not a
personal smartphone. Cares a lot about verifying a driver's identity before handing over produce,
and about getting an immediate, plain digital payment confirmation (distrust of digital payment
came up repeatedly).

**Wholesale buyer** — buys produce in bulk, either travelling to farms in person or, in the app's
model, remotely. Currently the only way to trust an unfamiliar farmer is to go and look at the
crop yourself; the core problem the app has to solve for this role is trust in someone you've
never met — verified identity, transaction history, and a way to inspect the goods without
travelling.

**Coordinator** — a cooperative or regional contact who already informally verifies farmers,
tracks prices, and mediates disputes by phone. The app's job for this role is to formalize and
surface work they're already doing, not invent new work: approve new farmer sign-ups, publish a
daily benchmark price range per crop, see all regional activity in one dashboard, and keep a
record when something goes wrong instead of relying on memory and phone calls.

**Logistics/delivery provider** — picks up and delivers produce. Financially exposed if they
collect stock nobody has agreed to buy yet, or if they drive back with an empty vehicle. Wants
jobs tied to a confirmed order, consolidated pickups from several small farms (a single small
farmer's harvest isn't worth a dedicated trip), an optimized route across pickups, and a way to
book a return-leg load.

*(Inferred, not stated by any interviewee: an implicit household-delegate concept — a nominated
family member operating the account on a farmer's behalf — surfaced from observing the farmer
participant's actual device usage, not something anyone asked for by name.)*

## Core functional capabilities

**Identity & trust**
- Registration for all four roles, with role-specific detail (crop, business docs, vehicle
  registration, region)
- Coordinator approval gates new farmer sign-ups before their listings become visible to buyers
- Driver/vehicle verification surfaced to the farmer before they hand over produce
- Farmer and delivery ratings, and a visible transaction history, so a buyer can judge someone
  they've never met

**Listing & discovery**
- Farmer creates a listing: crop, quantity, quality grade, harvest date, pickup location, photos
- Buyer searches/filters listings by crop, quantity, quality, location, price
- Buyer can also post a "reverse listing" — a crop request — for farmers to respond to
- A coordinator-maintained daily benchmark price range per crop, sourced from official/regional
  indices, shown to both farmers and buyers so nobody is negotiating blind

**Trade & negotiation**
- Buyer sends a purchase request; farmer accepts or negotiates price/terms
- Live in-app video call so a remote buyer can inspect actual stock before committing (this
  replaces the in-person farm visit that currently exists purely to establish trust)
- Renegotiation flow for when the market price moves between order and delivery

**Payment**
- Escrow-style payment: an advance released to the farmer on order confirmation, balance released
  once the buyer confirms receipt/inspection
- Immediate, plainly worded digital receipt on every completed transaction

**Logistics**
- Shared ("batched") transport across several nearby farmers' listings vs. a solo dedicated
  vehicle, with a transparent per-kilogram cost comparison
- Jobs only offered to a logistics provider once a buyer order is confirmed (no unsold-stock risk)
- Optimized multi-stop route across a batch's pickup points
- Return-leg freight booking so a vehicle isn't driving back empty
- In-app messaging/calling between farmer, buyer, and driver, replacing ad hoc phone coordination

**Regional oversight**
- Coordinator dashboard: registered farmers, active listings, pending approvals, open disputes
- Dispute log tied to a transaction, with a recorded resolution, escalated to the coordinator
- Exportable periodic regional summary report

## Key workflows

**Farmer lists and sells a harvest**
1. Farmer picks a crop, enters quantity/quality/price (benchmark price shown as a reference)
2. Adds photos, chooses solo or shared transport, publishes the listing
3. Receives buyer offers, accepts or negotiates
4. On confirmed sale: coordinator batches it into shared transport if applicable, a driver is
   assigned, farmer verifies the driver's identity at pickup, hands over produce
5. Payment is released (escrow balance) and a digital receipt is generated

**Wholesaler sources and buys remotely**
1. Buyer searches/filters listings, opens one, checks the farmer's rating/history
2. Requests a live video call to inspect the actual stock
3. Negotiates price/quantity, confirms the order; escrow advance is paid
4. Selects a logistics partner for delivery (or arranges own transport)
5. On delivery: confirms receipt, releases the remaining escrow balance, rates the farmer/delivery
   — or raises a dispute/price-adjustment if goods don't match what was ordered

**Coordinator keeps a region trustworthy and moving**
1. Reviews and approves/rejects new farmer registrations in their region
2. Sets/updates the daily benchmark price per crop
3. Batches multiple farmers' listings onto a shared transport slot, assigns a verified driver
4. Monitors in-progress transactions; when a dispute is raised, reviews the trail and records a
   resolution

**Logistics provider fulfills a delivery**
1. Browses available jobs (only those tied to a confirmed buyer order)
2. Accepts a job, possibly a consolidated multi-farmer batch, and views the optimized route
3. Confirms each pickup and records actual load; confirms drop-off and captures buyer confirmation
4. Books a return-leg load rather than driving back empty

## Constraints and context that shape the design

- **Shared, low-capability devices.** At least one core persona (the farmer) does not have
  exclusive use of a smartphone. Flows need to tolerate a family member operating the account on
  someone else's behalf.
- **Unreliable rural connectivity.** Raised independently by three of the four interviewees
  (farmer, coordinator, logistics provider). Listings and job data need offline caching, images
  need compressing before upload, and actions taken offline need to queue and sync when a
  connection returns.
- **Low digital literacy.** Interfaces need to lean on visual crop icons, minimal free-text entry,
  and step-by-step wizards rather than dense forms.
- **Sinhala and Tamil localisation.** All four interviews were conducted in Sinhala or Tamil — the
  app needs full localisation with a language switch, not just English with translated labels
  bolted on.
- **Distrust of digital payment and of strangers.** Comes up from both the farmer (payment) and the
  wholesaler (trust in an unfamiliar seller) sides — escrow, verification, and visible history
  exist specifically to answer this, not as generic e-commerce features.
- **Financial risk asymmetry is the single thing nearly every trust feature answers.** Three
  distinct fears, each held by a different role, and each with its own feature: a buyer doesn't
  want to pay an unfamiliar farmer up front (→ escrow), a logistics provider doesn't want to carry
  stock nobody has agreed to buy (→ confirmed-order-only jobs), and a farmer doesn't want to hand
  over produce to an unverified driver (→ driver/vehicle verification at pickup). Framing it this
  way is useful because it means escrow, verification, and ratings aren't three unrelated
  "trust features" — they're the same underlying problem solved three times, once per role.
- **The coordinator is a deliberate trust checkpoint, not a bottleneck to design out.** The
  research explicitly treats disintermediation as partial: middlemen who take an unnecessary cut
  are the target, not the coordinator's verification/mediation role.
- **Produce is perishable and listings are time-boxed.** *(Inferred, not stated directly.)* Farmers
  want to sell "before it spoils" and transport batching is time-sensitive, so listings should
  probably be treated as short-lived and expiring rather than as a long-lived product catalog.
- **The marketplace is likely region-scoped, not one global feed.** *(Inferred.)* Coordinators,
  benchmark prices, and shared-transport batching are all organized around named regions in the
  research (e.g. Kurunegala, Dambulla) — nothing in the source material describes a buyer sourcing
  across regions, which may be a deliberate design constraint rather than an oversight.

## Terminology

- **Batch / shared transport** — combining several nearby farmers' harvests into one pickup trip so
  freight cost is split, instead of each farmer booking a separate solo vehicle.
- **Benchmark price** — a daily reference price range per crop, set by the coordinator from
  official or regional market data, shown to both farmers and buyers so neither is negotiating
  without a reference point.
- **Escrow** — the app holds the buyer's payment; an advance is released to the farmer when the
  order is confirmed, and the remaining balance only once the buyer has received and inspected the
  goods.
- **Reverse listing** — a buyer posts what they want to buy (crop, quantity, price range, delivery
  date) instead of waiting for a matching farmer listing to appear.
- **Coordinator** — a cooperative or regional contact who approves new farmers, sets benchmark
  prices, arranges shared transport, and mediates disputes; not a buyer or a seller.

## Open questions / gaps

- **Persistence and authentication** were open when this was written; both were settled on
  18 September 2026 — MongoDB via Mongoose, and phone + password with one JWT and a shared role
  matrix (`.plans/DECISIONS.md`). What is in the database today: `.plans/DATA-MODEL.md`.
- **Family/delegate access** (a nominated household member operating a farmer's account) appears in
  the UX research findings but was explicitly scoped *out* of the current development sprints per
  the project charter — worth knowing before assuming it's in scope for early implementation.
  Likewise **escrow payment, dispute resolution, shared transport logistics, and the coordinator
  dashboard** are all described in the research but were also marked out-of-scope for the current
  build timeline — treat this document as the long-run product shape, not the current sprint's
  scope. Check `.plans/DECISIONS.md` and current Jira status for what's actually being built now.
- **Payment mechanism specifics** (which payment rails, how escrow is actually held/settled) are
  described functionally (advance + balance release) but not technically specified anywhere yet —
  no digital wallet, bank rail, or mobile-money provider is named anywhere in the source material.
- **What "verification" actually checks** for a driver or a new farmer (ID document? a physical
  visit? something else?) is described only as an outcome ("verified" badge/status) in the
  research, not as a process.
- **Whether the benchmark price is binding is unclear.** It's described as visible to both farmers
  and buyers and set by the coordinator, but nothing in the research says what happens if a farmer
  wants to list above or below it — is it a suggestion, or does it cap/floor the actual price?
- **How far coordinator authority over a dispute goes** isn't specified — the research describes
  "coordinator mediates" but not what happens if either party disputes the coordinator's own
  ruling, or whether there's an escalation path beyond the coordinator.
- **Rating/reputation mechanics are unspecified** — referenced as a feature (farmer ratings, buyer
  ratings) but how a score is calculated, whether it's public, and what a low rating actually does
  to someone's ability to transact are all undefined.
- **Multi-crop listings and orders aren't addressed.** Every workflow in the source material
  describes one crop, one listing, one order — bulk or mixed-crop orders are an open question.
