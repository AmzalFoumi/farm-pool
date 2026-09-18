# Auth build plan — the six gates, and what actually happened

The plan that produced FARM-33 and FARM-34, kept because the reasoning outlives the pull requests.
`README.md` next to this file explains how the result works; `OPEN.md` lists what is still to be
decided. Settled decisions live in `../DECISIONS.md`, not here.

## Goal

Phone + password registration and login for the four roles (farmer, buyer, coordinator,
logistics), one signed token, and role-based access control — built so the same core runs under
NestJS today or Expo API routes later. Deliberately not in scope: OTP, phone or email
verification, refresh tokens, password reset.

## How the work was gated

Each gate ended with its verification commands run and shown, a commit in the repo's format, and
a stop for review before the next gate. Two pull requests, the second branched from the first:

| PR | Branch | Jira | Gates |
| -- | ------ | ---- | ----- |
| #11 | `feat/FARM-33-mongo-shared-build` | FARM-33 (task under FARM-2 *Platform Foundation*) | AUTH-1, AUTH-2 |
| #12 | `feat/FARM-34-auth-rbac` | FARM-34 (story under FARM-3 *Identity, Verification and Trust*) | AUTH-3 … AUTH-6 |

Split that way because the first half is a platform decision every later feature depends on
(MongoDB, and `packages/shared` importable from `api/`), and it is reviewable on its own.

## The gates

| Gate | Scope | What it delivered | Status |
| ---- | ----- | ----------------- | ------ |
| AUTH-1 | shared | `dist/` build so `api/` can import shared; role, phone, register/login/user/token schemas; the permission matrix | done |
| AUTH-2 | api | env validation, MongoDB via Mongoose, `User` entity, Mongoose and in-memory repositories | done |
| AUTH-3 | api | scrypt hasher, HS256 signer, register/login/me/list use-cases, `JwtAuthGuard` + `RolesGuard`, endpoints, unit + e2e tests | done |
| AUTH-4 | api, docs | coordinator seed script; `auth/README.md`; decisions recorded | done |
| AUTH-5 | mobile | SecureStore session, `apiFetch` client, `AuthProvider`, `Stack.Protected` route guard | done |
| AUTH-6 | mobile | Log in and Sign up screens on the design system; Profile shows the account and logs out | done |

## Where the plan and the result differ

Recorded so the next reader does not assume the plan was followed to the letter.

- **`jose` → `jsonwebtoken`.** `jose` v6 is ESM-only and `api/` is CommonJS; an hour was budgeted
  for making Jest load it, and the fallback was taken. One-file swap behind the `TokenSigner` port.
- **Coordinators self-register.** The plan had them seeded only. Overruled on 18 Sep 2026 so all
  four onboarding paths can be built in parallel. This is the top item in `OPEN.md`.
- **Mongoose pinned to `~9.9`.** Driver 7.6 fails its handshake under Jest
  (Automattic/mongoose#16499); 7.5 does not.
- **A 15-second request timeout and an https check** were added to the mobile client after
  review of PR #12; neither was in the plan.

## Verification that was run at the end

`npm test -w api` (25 unit tests), `npm run test:e2e -w api` (12 e2e against
`mongodb-memory-server`), `npx tsc --noEmit -p mobile`, and the manual click-through in
`../VERIFY.md` under "Auth smoke check".
