# Decisions

Stack choices, the reasoning behind them, and what is deliberately still open.

**Read this before picking a framework, library or pattern.** Several questions below are open on
purpose. Answering one silently — by just installing something — closes a decision the team has
not made.

---

## Settled

### Monorepo with npm workspaces

npm rather than pnpm. It is already installed everywhere Node is, so three teammates need no extra
tooling step. pnpm's advantages (disk efficiency, stricter dependency resolution) are real but do
not pay for themselves at four people and one short project.

### Mobile: Expo, managed workflow

Rather than bare React Native. The decisive factor is demo mechanics: `npx expo start` plus a QR
code puts the app on any phone in seconds, including a panel member's during a sprint review. Bare
React Native means native build tooling on every machine that wants to run it.

The cost, accepted: no custom native modules without ejecting or a development build. Nothing in
the current scope needs one.

### Jira project key is `FARM`

Not `SE38`. Jira's development-panel linker and Smart Commits match issue keys as
`[A-Z]{2,}-\d+` — two or more **letters**, then a hyphen and a number. A key with digits in it
risks silently failing to match, which would break every commit-to-issue link without any error
message to explain why.

### Git hooks: lefthook, not husky

Commit linting was initially rejected as setup friction — a tool three teammates must install and
configure before they can contribute. That reasoning was about **husky**, which needs a `prepare`
script and a manual install step.

**Lefthook** removes the objection rather than accepting it. Its npm package runs
`lefthook install -f` on postinstall, so `npm install` is the whole setup and there is no path
where a teammate ends up committing without the hooks. It is also a single Go binary rather than a
set of shell scripts, which matters on a team split across Windows and macOS.

The pattern is taken from `sliit-foss/sliitfoss-web`. Two things there were deliberately **not**
copied: their `eslint-config-next` (a web config — the mobile equivalent is `eslint-config-expo`),
and their capitalised commit types (`Feat`, `Fix`), which contradict the lowercase Conventional
Commits format in `CLAUDE.md`.

Added beyond that pattern: commitlint's `references-empty` rule with `issuePrefixes: ["FARM-"]`,
which rejects a commit that cites no Jira issue. This is the rule worth having — a missing key
fails *silently*, producing a commit that looks fine and is invisible to Jira forever after.

None of this tooling reaches the app bundle. It runs on the developer's machine between the
keyboard and the commit, so React Native compatibility does not enter into it.

### Backend: not Next.js

Next.js was named as the stack early on and carried forward for a while without being argued for.
It is eliminated:

- It is a React **web** framework, and the only client here is a mobile app. SSR, RSC and the
  routing layer are dead weight — you would use route handlers and ignore the rest.
- Its main practical advantage is trivial Vercel deployment, and that likely does not apply: for a
  sprint demo, Expo Go on the same Wi-Fi reaches the development machine's local IP directly. No
  deployed backend is required to demonstrate the app.

---

## Open

### 1. What `api/` is — decided before scaffolding

Three live options. Whichever wins, `packages/shared` holds the types and zod schemas both sides
import, so the choice does not leak into `mobile/`.

| Option | For | Against |
| ------ | --- | ------- |
| **NestJS + TypeScript** | Module-per-feature splits work cleanly across four people and gives each member an ownable slice to explain at the viva. Dependency injection and validation pipes are built in. | 1–2 days of learning curve; needs a real Node host |
| **Express + TypeScript** | Least friction — everyone can contribute on day one. Lowest risk of code nobody on the team understands. For CRUD over two sprints, there is not much to assemble. | You build structure, validation and error handling yourself |
| **Expo Router API routes** (no `api/` at all) | One codebase, one language surface. `+api.ts` files inside the Expo app; requires `web.output: "server"`. | Still needs a Node server deployed. Native builds require `origin` configured in the expo-router plugin — an extra failure mode, and it fails during a live demo on someone else's phone |

Until this is answered, `api/` stays a `.gitkeep` and the root `.gitignore` carries no
backend-specific entries.

### 2. Persistence

No database chosen. Deliberately downstream of question 1 — the framework shapes what ORM or
client is idiomatic.

### 3. Authentication

Not designed. The app has at least three distinct roles (farmer, buyer, logistics provider) with
genuinely different permissions, so this is not a detail to bolt on late. Flagged here so nobody
assumes a decision exists.

---

## How to record a decision here

When one of the open questions is answered, move it into **Settled** with the reasoning — not just
the outcome. The outcome alone tells the next person *what* was chosen; the reasoning tells them
whether the choice still holds when circumstances change. If a decision is later reversed, say so
in place rather than deleting the old entry.
