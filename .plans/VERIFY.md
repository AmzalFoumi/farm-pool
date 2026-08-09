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

The first must report both paths as ignored. The second must show `.plans/` files as untracked and
addable. Catches: private notes about to be published, or shared decisions invisible to teammates.

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

## CI

Open a PR: the checks must go green. Then push a deliberate type error and confirm they go red.
Catches: a workflow that runs but asserts nothing — passing on everything, including broken code.
