# Logistics provider (driver) — functional requirements

The functional requirements for the **logistics/delivery provider** role, extracted from the
SE3080 mid-project agile review (Group_038, Assignment 01) and reconciled against
`.plans/PRODUCT.md`.

**Status of this document.** It records what the role is _meant_ to do, and — in
[§10](#10-driver-registration-what-exists-today) — what is actually built. As of `main` at
`7821502`, registration, login and role-based access exist and work for all four roles (FARM-34);
`api/src/logistics/` is still empty scaffolding, so everything from LP-20 onward is unimplemented.
Where the agile review and `.plans/PRODUCT.md` disagree, the disagreement is noted in place rather
than silently resolved; see [Conflicts and open questions](#conflicts-and-open-questions).

**Sources.** Agile review §2.2 (scope), §2.4 (constraints), §2.5 (stakeholder roles), §4 (stack),
§5 (Sprint 1 goal and FARM-29), §5 review notes (batch-upload request). Persona and workflow
detail from `.plans/PRODUCT.md`. The agile review is a project-management document, not a
requirements spec — it names the role's _capabilities_ but does not decompose them, so most of the
decomposition below is drawn from `.plans/PRODUCT.md` and flagged as such in the Source column.

---

## The role in one paragraph

A logistics provider picks up produce from one or more farms and delivers it to a buyer. They are
financially exposed in two specific ways, and both shape the requirements: collecting stock nobody
has agreed to buy yet, and driving back with an empty vehicle. The platform's job is to offer only
jobs tied to a confirmed buyer order, to consolidate several small farms into one worthwhile trip,
and to make the driver's identity provable to a farmer who is about to hand over their entire
harvest to a stranger.

Per the agile review §2.5, the role's stated interest is: _"Fulfil consolidated pickup/delivery
jobs using the platform."_

---

## MVP boundary — read this before building anything

The agile review draws a hard line through this role, and it is easy to miss.

**In scope for Sprint 0–2** (§2.2, "Identity, verification and trust"):

- Registration and login for the logistics provider role
- **Driver verification status** — the verification state surfaced on the profile

**Explicitly out of scope for Sprint 0–2** (§2.2, "Out of scope … planned for later sprints"):

> Shared transport and logistics fulfilment (batch/solo toggle, job board, route optimisation,
> in-app job messaging)

So every requirement below from **LP-20 onward is deferred work**. Sprint 1 delivered _design only_
for this role (FARM-29, "Design Logistics Provider Onboarding and Profile Screens") — onboarding and
profile screens, not fulfilment. Building the job board now is building ahead of the agreed scope;
that is a product-owner decision, not an implementation detail.

Requirements are listed in full regardless, because the onboarding and profile data model has to
anticipate them. A registration flow that does not capture vehicle capacity cannot later support
batch assignment without a migration.

---

## 1. Identity, registration and verification — _in scope, Sprint 0–2_

| ID    | Requirement                                                                                                                                                                                                                            | Source                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| LP-01 | A logistics provider can register an account and select the logistics provider role at sign-up.                                                                                                                                        | Review §2.2                                           |
| LP-02 | Registration captures role-specific detail: **vehicle registration**, vehicle type and capacity, operating region, and contact number.                                                                                                 | PRODUCT.md "Identity & trust"                         |
| LP-03 | The account carries a **verification status** (e.g. unverified / pending / verified) that is visible to the provider on their own profile.                                                                                             | Review §2.2                                           |
| LP-04 | Driver and vehicle verification details are **surfaced to the farmer at pickup**, before the farmer hands over produce. This is the requirement the whole verification feature exists for — a status nobody else can see is worthless. | PRODUCT.md "Identity & trust"; workflow step 4        |
| LP-05 | A logistics provider can log in and out, and the app restores their session without re-entering credentials on every cold start.                                                                                                       | Review §2.2 ("registration/login for all four roles") |
| LP-06 | A logistics provider has a profile screen showing their vehicle, region, verification state and rating.                                                                                                                                | Review §5, FARM-29                                    |
| LP-07 | Registration is a **step-by-step wizard with minimal free-text entry**, not a dense form.                                                                                                                                              | Review §2.2, §2.4                                     |

> **Not specified anywhere:** what verification actually _checks_ — an uploaded ID document, a
> vehicle registration photo, a coordinator's physical inspection, or a coordinator vouching from
> personal knowledge. `.plans/PRODUCT.md` lists this as an open question. It blocks LP-03/LP-04
> being implementable beyond a status enum.

---

## 2. Job discovery — _deferred beyond Sprint 2_

| ID    | Requirement                                                                                                                                                                                                                                                 | Source                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| LP-20 | A logistics provider can browse a **job board** of available pickup/delivery jobs.                                                                                                                                                                          | Review §2.2 (out-of-scope list names "job board")   |
| LP-21 | **Only jobs tied to a confirmed buyer order are offered.** A job never exists for unsold stock. This is the single most important constraint in this section — it is the direct mitigation for the provider's fear of collecting produce nobody has bought. | PRODUCT.md "Logistics"                              |
| LP-22 | A job listing shows: pickup location(s), drop-off location, crop and total load, whether it is a solo or consolidated batch, and the distance/route length.                                                                                                 | PRODUCT.md workflow step 2 (inferred decomposition) |
| LP-23 | Jobs can be filtered or sorted by region and by load size, so a provider is not shown jobs their vehicle cannot carry or their region does not cover.                                                                                                       | Inferred from LP-02 + §2.4 rural constraints        |
| LP-24 | A logistics provider can accept a job, which assigns it to them and removes it from other providers' boards.                                                                                                                                                | PRODUCT.md workflow step 2                          |

---

## 3. Consolidated (batched) pickups — _deferred beyond Sprint 2_

| ID    | Requirement                                                                                                                                                                              | Source                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| LP-30 | A job may be a **consolidated multi-farmer batch** — several nearby farmers' listings combined into one trip, because a single smallholder's harvest is not worth a dedicated vehicle.   | PRODUCT.md "Logistics"; persona §2.5   |
| LP-31 | Batches are assembled by the **coordinator**, who batches listings onto a shared transport slot and assigns a verified driver. The provider receives the batch; they do not assemble it. | PRODUCT.md coordinator workflow step 3 |
| LP-32 | The platform supports a **batch/solo toggle** — shared transport vs. a dedicated vehicle — with a transparent per-kilogram cost comparison shown to the farmer at listing time.          | Review §2.2; PRODUCT.md "Logistics"    |
| LP-33 | A batched job shows every pickup point as a distinct, individually confirmable stop.                                                                                                     | Inferred from LP-40/LP-50              |

---

## 4. Route — _deferred beyond Sprint 2_

| ID    | Requirement                                                                                                                                                                   | Source                              |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| LP-40 | A provider can view an **optimised multi-stop route** across a batch's pickup points, ending at the buyer's drop-off.                                                         | Review §2.2; PRODUCT.md "Logistics" |
| LP-41 | The route and job detail are **cached offline** and remain readable with no connection, since the route is consumed while driving through exactly the areas with no coverage. | Review §2.2, §2.4                   |

---

## 5. Executing the job — pickup and drop-off — _deferred beyond Sprint 2_

| ID    | Requirement                                                                                                                                             | Source                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| LP-50 | The provider **confirms each pickup** and **records the actual load** collected, which may differ from the listed quantity.                             | PRODUCT.md workflow step 3                                                    |
| LP-51 | At each pickup, the farmer can see the driver's verification detail to confirm they are handing produce to the assigned person.                         | PRODUCT.md farmer workflow step 4                                             |
| LP-52 | The provider **confirms drop-off** and captures the buyer's confirmation of receipt.                                                                    | PRODUCT.md workflow step 3                                                    |
| LP-53 | Job status moves through a visible lifecycle (available → accepted → in transit → delivered) reflected to farmer, buyer and coordinator.                | Inferred; matches the order-lifecycle colour tokens documented in `CLAUDE.md` |
| LP-54 | Pickup and drop-off confirmations taken offline are **queued and synced on reconnect**, and the provider is told the action is queued rather than lost. | Review §2.2 ("action queueing on reconnect"), §2.4                            |
| LP-55 | Photos attached to a confirmation are **compressed before upload**.                                                                                     | Review §2.2                                                                   |

---

## 6. Return leg — _deferred beyond Sprint 2_

| ID    | Requirement                                                                         | Source                                  |
| ----- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| LP-60 | A provider can book a **return-leg load** so the vehicle is not driving back empty. | PRODUCT.md "Logistics"; workflow step 4 |

> This appears in `.plans/PRODUCT.md` as a named persona need but does **not** appear in the agile
> review's scope section at all — neither in scope nor in the out-of-scope list. It is the one
> logistics capability the review omits entirely.

---

## 7. Communication — _deferred beyond Sprint 2_

| ID    | Requirement                                                                                                                                | Source                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| LP-70 | **In-app job messaging** between farmer, buyer and driver, replacing ad hoc phone coordination.                                            | Review §2.2 (out-of-scope list); PRODUCT.md "Logistics" |
| LP-71 | Contact for a job is reachable from the job detail screen, so a driver who cannot find a farm gate does not have to leave the app to call. | Inferred from LP-70                                     |

---

## 8. Reputation — _deferred beyond Sprint 2_

| ID    | Requirement                                                                                         | Source                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| LP-80 | Buyers rate the delivery after confirming receipt; the rating is visible on the provider's profile. | Review §2.2 (out-of-scope, "farmer ratings, transaction history"); PRODUCT.md buyer workflow step 5 |
| LP-81 | A provider has a visible transaction/job history.                                                   | PRODUCT.md "Identity & trust"                                                                       |

---

## 9. Cross-cutting requirements

These apply to every screen in the role, not to one feature. They come from the review's
constraints (§2.4) and are assessed by SE3050, so they are functional requirements here rather
than background.

| ID    | Requirement                                                                                                                                                                                                                          | Source                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| LP-90 | Every logistics screen works on **unreliable rural connectivity** — job details cached offline, actions queued on reconnect. Connectivity was raised independently by three of four interviewees, the logistics provider among them. | Review §2.2, §2.4                   |
| LP-91 | Full **Sinhala and Tamil localisation** with a language switch — not English with translated labels. All four interviews were conducted in Sinhala or Tamil.                                                                         | Review §2.2; PRODUCT.md constraints |
| LP-92 | Low-digital-literacy UI: visual cards, minimal free text, step-by-step wizards.                                                                                                                                                      | Review §2.2, §2.4                   |
| LP-93 | Every interactive element clears the 48dp tap target (`min-h-tap`). A driver uses this one-handed, outdoors, often in a vehicle.                                                                                                     | `CLAUDE.md` rule 4                  |

---

## Conflicts and open questions

**1. ~~The role has two different names in the codebase.~~ Resolved.** The picker's card is now
`id: "logistics"` labelled "Delivery partner", and `role.ts` documents the split explicitly: the
internal name matches the domain name so a driver's account and the logistics module agree on one
word. Nothing to do.

**2. ~~The role picker omits `coordinator`.~~ Resolved, the other way.** All four roles
self-register (decided 18 Sep 2026, `.plans/auth/README.md`); the picker shows four cards. Vetting
an account is `accountStatusSchema`'s job, not the register endpoint's.

**3. Verification is undefined.** Still open — the one genuine blocker in this list. See the note
under §1 and [§10.5](#105-still-undecided). Nothing past a status enum is implementable until the
team decides what is checked and who checks it.

**4. ~~Authentication and persistence are both undecided.~~ Resolved, but not as the review
states.** Both were settled on 18 Sep 2026 and are built: **MongoDB via Mongoose** (FARM-33) and
**phone + password with a self-hosted 30-day JWT** (FARM-34) — _not_ Clerk, despite the agile
review §4 naming it as the Sprint 0 decision. The review is out of date on this point. The full
reasoning is in `.plans/auth/README.md` and `.plans/DECISIONS.md`.

**5. Return-leg booking (LP-60) is unscoped** — present in `.plans/PRODUCT.md`, absent from the
review's scope section entirely.

**6. Batch upload was requested but is not a logistics requirement.** The Sprint 1 review records
the client asking to prioritise "the batch-upload feature for produce listings to better
accommodate the logistics workflow". That is a _farmer listing_ feature justified by a logistics
benefit; it belongs in the catalog domain, not here. Noted so it is not mistakenly implemented
against this role.

---

## 10. Driver registration — what exists today

Read off `main` at `7821502`. A `logistics` account is already creatable end to end, so LP-01 and
LP-05 need nothing built.

`sign-up-as.tsx` → `sign-up.tsx?role=logistics` → `POST /identity/register` → token in SecureStore
→ `Stack.Protected` swaps to the app shell.

| File                                          | One line                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `mobile/src/app/sign-up-as.tsx`               | Role picker. "Delivery partner" is `id: "logistics"`.                            |
| `mobile/src/app/sign-up.tsx`                  | Account form: name, phone, password.                                             |
| `mobile/src/providers/auth-provider.tsx`      | `signIn` / `signUp` / `signOut` / `refresh`, session state.                      |
| `mobile/src/lib/session-storage.ts`           | Token in `expo-secure-store`.                                                    |
| `mobile/src/app/_layout.tsx`                  | Picks the shell by permission — **a driver currently lands in the buyer shell**. |
| `api/src/identity/identity.controller.ts`     | `POST /identity/register`, `/login`, `/me`.                                      |
| `packages/shared/src/identity/auth.ts`        | `registerSchema` — one flat object shared by all four roles.                     |
| `packages/shared/src/identity/permissions.ts` | Permission matrix; `"delivery:accept": ["logistics"]` exists, unused.            |

> **FARM-45 status.** Built: vehicle capture after sign-up (LP-02, LP-07, LP-09, LP-10), the
> verification state on the account (LP-03, LP-11), the `(driver)` shell guarded by
> `can(role, "delivery:accept")` (LP-08) and the profile screen (LP-06, without rating). Not
> built: surfacing the driver to a farmer at pickup (LP-04), which needs a job to attach to
> (FARM-49), and anything that moves verification past `pending` (open question 3). The list below
> is what was missing before FARM-45.

### 10.1 Missing for a driver

- Vehicle data — nowhere in `registerSchema`, `User`, `UserDocument` or `publicUserSchema`. **FARM-49 can't assign a driver without it.**
- Verification state — only the account-wide `accountStatusSchema`.
- Driver route group — `mobile/src/app/` has `(tabs)`, `(farmer)`, `(coordinator-tabs)` only.
- Driver profile screen — designed in FARM-29, never built.

### 10.2 Requirements this adds

| ID    | Requirement                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------- |
| LP-08 | A driver gets their own shell, guarded by `can(role, "delivery:accept")` — not a `role === "logistics"` test.  |
| LP-09 | Vehicle detail is captured after the account exists, not in `registerSchema`.                                  |
| LP-10 | An incomplete vehicle profile sends the driver to finish it, not to an empty job board.                        |
| LP-11 | `publicUserSchema` gains vehicle and verification fields as optional, so one type still serves all four roles. |

**Why LP-09:** `registerSchema` is shared by all four roles and by both the form and the api pipe.
Required vehicle fields there break the other three roles' sign-up mid-sprint, so capture goes in a
second step with its own endpoint and schema.

**Still undecided:** what verification actually checks (see §1). The enum works either way, so
FARM-45 can start — but raise it at planning rather than letting the implementation answer it.

---

## Where this lands in the code

Per `.plans/STRUCTURE.md` and the domain READMEs, the role splits across two API domains:

- **`api/src/identity/`** — the account, the logistics role, and verification (LP-01 … LP-07).
  Personas are roles modelled in `identity`, not domains of their own.
- **`api/src/logistics/`** — jobs, batches, routes, pickup/drop-off confirmation
  (LP-20 … LP-60).
- **`api/src/coordination/`** — batch assembly and driver assignment (LP-31) is a _coordinator_
  action, so it lives there and acts on the logistics domain.

On the mobile side, a driver can sign up, log in and hold a session today — but lands in the buyer
tab shell, because no `(driver)` route group exists. The role's own screens are Figma design work
completed in Sprint 1 (FARM-29) and never implemented.

## Build order

Dependency order, not priority order. FARM-49 and FARM-54 are the Highest-priority stories, but
neither can start first.

1. **FARM-45** — driver and vehicle verification. No upstream blocker. Establishes the driver
   profile shape every later story assigns against. → §10, LP-02/03/04/06/08–11.
2. **FARM-49** — assign a driver (solo or batch). Needs FARM-45 for a driver to exist, and
   Tharushi's **FARM-46** for orders to reach `open` — LP-21 forbids a job without a confirmed
   order. Writes `assigned`. → LP-30/31/32.
3. **FARM-54** — driver accepts and confirms fulfilment. Needs jobs from FARM-49. Drives
   `in_transit` → `delivered`. → LP-24/50/52.
4. **FARM-26** — pickup and drop-off preview. Needs job data from FARM-49. → LP-22/40.
5. **FARM-52** (Sprint 4) — post-delivery ratings. → LP-80.

`packages/shared/src/orders/order.ts` already reserves `assigned → in_transit → delivered` in
`orderStatusSchema`, with a comment marking them as a later story's work. That is this role's
work: the lifecycle does not need designing, only filling in.
