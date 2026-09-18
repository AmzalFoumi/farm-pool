# Verify

How to check each piece of the setup actually works. Each check names the failure it catches —
a check you cannot fail is not a check.

## Repository hygiene

**`.gitignore` is doing its job**

```
git status --short
```

after any `npm install`. `node_modules/` must not appear. Catches: dependencies entering history,
which later requires rewriting every subsequent commit to remove — and rewriting history destroys
the per-member contribution record.

**The local layer is ignored, the shared layer is not**

```
git check-ignore -v CLAUDE.local.md .plans.local/SETUP.md
git status --short .plans/
```

The first must report both paths as ignored. The second must show `.plans/` files as tracked (clean,
or as ordinary modifications) — never as ignored. Catches: private notes about to be published, or
shared decisions invisible to teammates.

**No secrets staged**

```
git diff --cached --name-only
```

before every commit. Watch for `.env`, `*.key`, `*.jks`, `*.p12`. Note that the root ignore rule is
`.env*.local`, which does **not** match a plain `.env`.

**Line endings are normalised**

```
git ls-files --eol | grep -v "w/lf"
```

Should return nothing but binaries. Catches: a working copy checked out as CRLF while Prettier
writes LF — the two fight, and the loser's next commit is a whole-repo diff that cannot be reviewed
and rewrites `git blame` for every file. `.gitattributes` prevents it; this confirms it took.

**Git hooks actually installed**

```
npx lefthook run pre-commit
```

Then try a deliberately bad commit message — `git commit -m "broke it"` — and confirm it is
rejected. Catches: hooks configured in `lefthook.yml` but never installed into `.git/hooks/`,
which happens if `npm install` ran with `--ignore-scripts`. The config looks correct and enforces
nothing. Fix with `npx lefthook install`.

## Collaboration

**All four members have push access**

```
gh api repos/AmzalFoumi/farm-pool/collaborators --jq '.[].login'
```

Four logins. Catches: the whole team's work landing under one author, which is the single most
damaging thing for SE3080's per-member contribution requirement and the individual viva.

This endpoint lists **accepted** collaborators only. If it returns fewer than four, check whether
the rest are simply un-clicked invitations before assuming the grant failed:

```
gh api repos/AmzalFoumi/farm-pool/invitations --jq '.[].invitee.login'
```

**Branch protection holds**

Push directly to `main` — it must be rejected with `GH013: Repository rule violations found`. Open
a PR without a review — merge must be blocked. Catches: a ruleset left at enforcement `evaluate`
rather than `active`, which records the violation and lets the push through. The settings page
looks identical either way.

Use an empty commit so there is nothing to clean up but the commit itself:

```
git commit --allow-empty -m "chore(repo): FARM-0 verify branch protection"
git push          # must fail
git reset --hard origin/main
```

**Contributions are distributed**

```
git shortlog -sn
```

All four names, with work spread across them. Run this weekly, not at the end — an imbalance found
on 24 August cannot be fixed.

## Jira integration

**The single test that proves the GitHub↔Jira link works**

1. Branch: `feature/FARM-1-setup`
2. Commit: `chore: FARM-1 verify jira link`
3. Push, open a PR
4. Open `FARM-1` in Jira

The Development panel must show the branch, the commit and the pull request. Catches: the
integration appearing connected while linking nothing — which stays silent until you look, and by
then a sprint of commits has no traceability.

If it fails, the cause is almost certainly that the repo is under a personal GitHub account rather
than an organization. See `DECISIONS.md`.

## Application

**Mobile runs on a real device**

```
npx expo start
```

Scan the QR code from a phone on the same Wi-Fi. The app must load. Catches: a project that only
works in a simulator on the machine that built it — which is exactly the situation that ruins a
live demo.

**Backend reachable from the phone**

With the API running, hit an endpoint from the app on a physical device — not from a browser on the
development machine. Catches: a server bound to `localhost` only, invisible to every other device
on the network. This works on the machine and fails in the demo.

**Shared types resolve**

Import something from `packages/shared` inside `mobile/` — `import { roleSchema } from
'@farm-pool/shared'` — and render its output. If it type-checks but fails to resolve at runtime,
**clear the Metro cache first**:

```
npx expo start --clear
```

Do *not* add `watchFolders` or `resolver.extraNodeModules` to a `metro.config.js`. Since SDK 52
`expo/metro-config` resolves workspace packages by itself, and the Expo docs now say to delete that
configuration where an older guide added it. Catches: the failure mode where cached module maps
from before the workspace existed survive an otherwise correct setup — and the much worse one where
someone "fixes" it with obsolete config that then breaks the next person's build.

**Shared types compile in `api/`** — proven 18 September 2026 (FARM-33)

`packages/shared` now builds to `dist/` (`main`/`types` point there; Metro still reads `src/`
through the `react-native` field). The api imports it in the identity module and builds:

```
npm run build --workspace @farm-pool/shared
npm run build --workspace api
```

Catches, now: a stale `dist/`. The api compiles against the built output, so after editing
anything in `packages/shared/src` rebuild it first, or the api reports a type error that points at
the wrong place. A root `npm install` also rebuilds it (`prepare` script).

**Api environment is validated**

```
cd api && cp .env.example .env    # then leave DATABASE_URI empty
npm run start:dev -w api
```

Must refuse to start with `Invalid environment. Fix these in api/.env` naming the key. Catches: a
server that starts, accepts requests, and fails minutes later on the first database call.

**Api tests need nothing installed**

```
npm test -w api          # unit: identity, catalog and orders use-cases on in-memory repositories, hasher, signer, guard
npm run test:e2e -w api  # boots a real MongoDB in memory (first run downloads ~100 MB, then cached)
```

Both must pass on a clean clone with no database running. If the e2e suite hangs for 30 s and
logs `Unable to connect to the database. Retrying`, check `npm ls mongodb`: driver 7.6.0 breaks the
handshake under Jest and `mongoose` must stay on `~9.9` until Automattic/mongoose#16499 closes.
On a blocked network set `E2E_DATABASE_URI` to an existing database instead of the download.

**Auth smoke check** — against `npm run start:dev -w api` with a real `.env`

```
curl -s -X POST localhost:3000/identity/register -H 'content-type: application/json' \
  -d '{"displayName":"Nimal","phone":"0771234567","password":"longenough","role":"farmer"}'
# → 201 {"token":"...","user":{...}}   (409 phone_taken on a second run — expected)

curl -s -X POST localhost:3000/identity/login -H 'content-type: application/json' \
  -d '{"identifier":"077 123 4567","password":"longenough"}'
# → 200, same user; the spelling with spaces must still match

TOKEN=<token from above>
curl -s localhost:3000/identity/me -H "authorization: Bearer $TOKEN"     # → 200 the user
curl -s localhost:3000/identity/me                                        # → 401 unauthorized
curl -s localhost:3000/identity/users -H "authorization: Bearer $TOKEN"  # → 403 forbidden (farmer)
```

Register a second account with `"role":"coordinator"` and repeat the last call with its token:
must be 200 with both users, and no `passwordHash` anywhere in the output. Catches: a guard
registered but not global (the 401 would be a 200), the role matrix not wired (the 403 would be a
200), the hash leaking through a response mapper.

For the app: do the same from a physical device with `EXPO_PUBLIC_API_URL` set to the machine's
LAN address, not `localhost`.

**Buyer smoke check** — listings, an order, a crop request (FARM-22 / FARM-35 / FARM-36)

```
npm run seed:listings -w api      # one farmer + eight verified listings; safe to re-run
```

Then with `npm run start:dev -w api` and a buyer account from `/identity/register`:

```
TOKEN=<buyer token>
curl -s "localhost:3000/catalog/listings?district=kurunegala" -H "authorization: Bearer $TOKEN"
# → 200, only Kurunegala rows, every one "status":"verified"

LISTING=<an id from above>
curl -s -X POST localhost:3000/orders -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d "{\"listingId\":\"$LISTING\",\"quantityKg\":1}"
# → 400 quantity_out_of_range (below the listing's minimum)
curl -s -X POST localhost:3000/orders -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d "{\"listingId\":\"$LISTING\",\"quantityKg\":20}"
# → 201 "status":"requested", total computed by the server

ORDER=<id from above>
curl -s -X POST localhost:3000/orders/$ORDER/cancel -H "authorization: Bearer $TOKEN"  # → 200 cancelled
curl -s -X POST localhost:3000/orders/$ORDER/cancel -H "authorization: Bearer $TOKEN"  # → 409

curl -s -X POST localhost:3000/catalog/wanted -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"cropId":"onion","quantityKg":200,"neededBy":"2026-10-01","district":"Dambulla"}'
# → 201 "status":"open"
```

Repeat `POST /orders` with the seed farmer's token (`+94771000001`): must be 403 `forbidden`.
Catches: a status filter missing (a draft would list), the quantity rule not enforced, the role
matrix not applied to the new actions, the price taken from the client.

In the app: log in as a buyer on a physical device, the Listings tab shows the seeded rows, a
listing opens, Place order with a quantity below the minimum shows the inline error, a valid one
lands on the order screen in Requested, Home → My orders lists it and Cancel turns it Cancelled;
My requests → New request saves and Close closes it. Check both in dark mode.

## CI

There is no CI workflow yet (`.github/` holds only the pull request template), so every check
above is run by hand before opening a PR. When a workflow is added: open a PR, the checks must go
green; then push a deliberate type error and confirm they go red. Catches: a workflow that runs but
asserts nothing — passing on everything, including broken code.
