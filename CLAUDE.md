# CLAUDE.md

Guidance for AI coding agents working in this repository. `AGENTS.md` points here, so this file is
the single set of rules regardless of which agent you are.

## What this is

**farm-pool** — *Rural Farmer-to-Market Direct Connect*, a mobile marketplace connecting rural
farmers directly to market buyers, cutting out the middlemen who currently take a third of a
smallholder's margin. Built by Group SE-38 for SE3050 (User Experience Engineering) and SE3080
(Software Project Management).

A monorepo with npm workspaces:

| Directory | What |
| --------- | ---- |
| `mobile/` | Expo (React Native), managed workflow — the app |
| `api/` | The backend. **Framework not yet chosen** — see `.plans/DECISIONS.md` |
| `packages/shared/` | Types and zod schemas imported by both sides |

Full layout and the reasoning behind it: **`.plans/STRUCTURE.md`**.
Stack decisions and what is still open: **`.plans/DECISIONS.md`**.
How to check things work: **`.plans/VERIFY.md`**.

Read `.plans/DECISIONS.md` before choosing a library, a framework, or a pattern. Several questions
there are deliberately open, and picking an answer without saying so silently closes a decision the
team has not made.

## Rules

### Never commit

**Do not run `git commit` or `git push`.** Write the suggested commit message as text and let the
developer run it. This holds even when the work obviously ends in a commit.

### Commit format

```
<type>(<scope>): FARM-n <subject>
```

Example: `feat(mobile): FARM-12 add produce listing form`

The `FARM-n` key is what links the commit to its Jira work item — without it, the commit does not
appear in Jira's Development panel and the traceability is lost. `<type>` is one of `feat`, `fix`,
`chore`, `refactor`, `docs`, `test`, `ci` — lowercase. `<scope>` is the workspace: `mobile`, `api`,
`shared`, `repo`, or omitted for repo-wide changes.

**This is enforced, not merely documented.** A `commit-msg` hook runs commitlint and rejects a
malformed message before the commit exists. The rules live in `commitlint.config.js`; the hooks in
`lefthook.yml`.

Hooks install themselves — the `lefthook` package sets them up during `npm install`, so there is no
setup step to forget. A `pre-commit` hook also runs Prettier over staged files and re-stages them.

`git commit --no-verify` skips both. Use it deliberately or not at all.

### Branch format

```
feature/FARM-12-listing-form
fix/FARM-31-price-rounding
```

Work happens on branches and lands via pull request. `main` requires a review from another member.

### Never commit these

- **Coursework artefacts** — reports, meeting minutes, retrospectives, sprint documentation,
  submission drafts. Those live in Confluence and the group's report tooling, not here. This repo
  holds code, what is needed to run it, and the engineering reasoning behind it.
- **Personal details of team members** — registration numbers, real-name-to-username rosters,
  emails, phone numbers. This repository is public, and a committed roster cannot be un-published:
  it stays in the history and in every clone and fork. The roster lives in Confluence. Per-member
  contribution is evidenced by `git shortlog` and the pull request record, which is what the module
  assesses anyway.
- **Secrets** — `.env` files, API keys, signing certificates, keystores. Commit `.env.example`
  with empty or dummy values instead.

### `.gitignore` files are merged, never replaced

If a `.gitignore` already exists at a path, read it first and append only what is missing. This
applies to the root file and to the one `create-expo-app` writes into `mobile/`. Overwriting one
silently un-ignores whatever the previous author added.

### Verify against current documentation

Fetch current vendor docs before pinning a version or asserting how an API behaves. Training data
goes stale, and this project has already had two decisions change shape once the real docs were
read.

## Working with a monorepo

`packages/shared` is the only place a type or validation schema shared between `mobile/` and `api/`
should live. Duplicating a type into both sides is how the two drift apart, and it is not caught by
either side's type checker.

**Do not hand-configure Metro for the monorepo.** Since SDK 52, `expo/metro-config` resolves
workspace packages automatically, and the Expo docs now say to *delete* `watchFolders`,
`resolver.nodeModulesPaths`, `resolver.extraNodeModules` and `resolver.disableHierarchicalLookup`
if an older guide put them there. If an import from `packages/shared` type-checks but fails to
resolve at runtime, clear the Metro cache first — `npx expo start --clear` — rather than adding
config. Most advice online predates SDK 52 and will make this worse.
