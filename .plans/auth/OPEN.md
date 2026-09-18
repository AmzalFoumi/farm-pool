# Auth — open questions, most urgent first

Things the team has to decide, not things that are broken. Each one says what happens if it is
left alone, so the priority is visible. When one is settled, move the outcome to
`../DECISIONS.md` and delete it here.

## 1. Coordinator self-registration — prioritised for discussion

**Raised** 18 Sep 2026 by review of PR #12. **Decision so far:** keep it, build the four paths,
revisit before any deployment beyond the team.

A coordinator is not like the other three roles. The role carries powers over other people's
accounts — `users:list` today, `farmers:approve` later — and public sign-up lets anyone pick it
from a menu, then hold a token that passes `@Allow('users:list')`.

Ways to close it, cheapest first:

1. **`pending_review` for self-registered coordinators.** The status field and enum value already
   exist. Register stores `status: 'pending_review'` when `role === 'coordinator'`; `RolesGuard`
   refuses coordinator-only actions while the status is not `active`; someone flips the status.
   Keeps the four sign-up paths. Roughly an hour with tests. **Recommended.**
2. **Invite code** from an env variable, checked at register. Simple; a shared code leaks.
3. **Remove coordinator from public sign-up**; provision through a seed script (none exists yet;
   `api/src/cli/seed-listings.ts` is the pattern). What the
   reviewer asked for; undoes the four-paths decision.

Note for option 1: the role is baked into the token, so a status flip is only seen at next login
until question 2 is settled.

## 2. Token revocation

A token is valid until it expires (30 days). Logout only deletes the device copy; a role or status
change is invisible until re-login. Documented trade-off in `README.md` with two upgrade paths
(`tokenVersion` on the user, or short access + refresh tokens). Becomes urgent the moment
`pending_review` or suspension has to take effect immediately.

## 3. Rate limiting on the public routes

`POST /identity/login` runs scrypt for every request, including unknown accounts (on purpose, so
timing does not reveal which phones exist). Without a limit, a flood of bad logins can slow real
ones. Add `@nestjs/throttler` on register and login, keyed by IP and by identifier, before any
public deployment. Also cap request-body size at the same time.

## 4. Password reset and account recovery

Not designed. Needs a second channel (SMS OTP, or email once it is a credential), and both are
out of scope until an SMS gateway with a Sri Lankan sender id is available.
