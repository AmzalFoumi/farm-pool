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

Two things  bundled with this setup in Amzal's reference repo elsewhere were deliberately **not** adopted:
`eslint-config-next`, which is a web config where the mobile equivalent is `eslint-config-expo`;
and capitalised commit types (`Feat`, `Fix`), which contradict the lowercase Conventional Commits
format in `CLAUDE.md`.

Added on top: commitlint's `references-empty` rule with `issuePrefixes: ["FARM-"]`, which rejects a
commit that cites no Jira issue. This is the rule worth having — a missing key fails *silently*,
producing a commit that looks fine and is invisible to Jira forever after.

None of this tooling reaches the app bundle. It runs on the developer's machine between the
keyboard and the commit, so React Native compatibility does not enter into it.

### Backend: NestJS + TypeScript

Decided 10 August 2026, from three live options (Express + TS, and Expo Router API routes were the
others).

The deciding argument is **assessment shape, not engineering taste**. SE3080 grades per-member
contribution and puts each member through an individual viva. Nest's module-per-feature layout
gives each of the four an ownable slice — `listings/`, `orders/`, `auth/` — with a controller, a
service and a module they can explain end to end. Express would produce the same features with the
boundaries drawn by convention rather than by the framework, and conventions erode fastest exactly
when four people are working in parallel against a deadline.

Accepted cost, stated plainly: **1–2 days of learning curve across the team**, on a calendar that
has already lost time to the Jira approval block. Dependency injection and decorators are new to
most people. The mitigation is that Nest's CLI generates the boilerplate (`nest g resource`), so
what has to be learned is the shape, not the typing.

Nest's `ValidationPipe` is not used for request validation. The zod schemas in `packages/shared`
are, so the mobile app and the API validate against one definition — that is the whole reason
`packages/shared` exists, and running a second `class-validator` definition alongside it recreates
the drift it was built to prevent.

### Backend architecture: light DDD, domains by capability

Decided 7 September 2026. `api/src/` is organised as five domain modules — `identity`, `catalog`,
`orders`, `logistics`, `coordination` — each split into three layers: `domain/` (entities,
value-objects, repository *interfaces* — pure rules), `application/` (services and DTOs), and
`infrastructure/` (repository *implementations*).

**Domains are drawn by capability, not by persona.** The four personas — farmer, buyer,
coordinator, logistics provider — are *roles*, modelled once in the `identity` domain. Every other
domain acts on behalf of whichever role is calling. Modelling by persona instead produces a
`Farmer` module that swells to hold listings, orders and payouts together, and a `Buyer` module
that copies half of it — the copy then drifts, which is the exact failure `packages/shared` exists
to prevent. `coordination` is a domain and not merely a role because a coordinator takes
independent action — managing a cooperative's combined supply — rather than only acting for one
farmer.

**Light DDD, not flat modules and not full DDD.** Flat Nest modules (controller + service +
module) were the alternative. The three-layer split wins because persistence is still open
(question 1 below): with the repository interface in `domain/` and its implementation in
`infrastructure/`, a domain can be built now against an in-memory repository and have the real
database dropped in later as one file, without `domain/` ever changing. Full DDD — aggregates,
domain events, a rich `shared/kernel` — was rejected as too heavy for four people on a short
project; the reference repo the team looked at had applied it fully to only one of its six
contexts, and the rest had bypassed their own layers.

**Accepted cost:** more files per feature than a flat module, and the team must hold the layer
boundary by discipline — Nest does not enforce it. Mitigation: one worked example (`catalog`) is
scaffolded first for everyone to copy.

**Kept DB-agnostic:** no ORM, no `schemas/` folder, no database package under any domain until
question 1 is answered. Adding one silently closes that decision.

### Mobile UI: gluestack-ui v5, styled by UniWind

Decided 12 September 2026. Verified against the live docs and the published CLI source on the day.

**Two layers, decided together.** UniWind is the styling engine — it makes `className="flex-row
gap-2 bg-background"` work on React Native components, and nothing more. gluestack-ui is the
component layer built on top of it: Actionsheet, Select, Modal, Toast, FormControl, and the rest,
with focus management, portal hosting and screen-reader wiring already done. They are not
alternatives to each other.

**Why a component library at all.** SE3050 assesses user experience, and the components where UX
is actually won — an accessible bottom sheet, a Select that is keyboard- and screen-reader-navigable,
a form field whose error text is announced rather than merely displayed — are exactly the ones that
are tedious and easy to get subtly wrong. The second reason is drift: with four people building in
parallel, hand-rolled buttons become four different buttons by the third week. That is the same
failure `packages/shared` exists to prevent, one layer up.

**Why UniWind rather than NativeWind.** gluestack v5 requires one of three engines. NativeWind v5
is published only as `5.0.0-preview.4` and its own documentation says it is "not intended for
production use". NativeWind v4 is stable but is Tailwind v3, and gluestack pairs it with a v4-alpha
core. UniWind is at `1.12.0`, MIT, Tailwind v4, and needs no Babel plugin or PostCSS step. Its one
restriction — Expo only, no bare React Native, no Next.js — costs this project nothing, because
`mobile/` is Expo and the backend is Nest.

**Accepted cost, stated plainly.** The gluestack CLI still prints "v5 alpha" on init, and five of
the twenty-three generated components did not type-check against React 19.2 / RN 0.86 / TS 6.0
strict. Those are patched in place with comments naming the upstream cause, which is possible
precisely because gluestack is copy-paste: the source in `src/components/ui/` is ours, not a
dependency. The flip side is that re-running the CLI to update a component will overwrite those
patches, so component updates need reviewing rather than accepting blind.

**Deviations from what the CLI generated**, all of which it got wrong for this repo's layout:

- the generated `babel.config.js` aliased `@` to the project root, contradicting `@/* → ./src/*`
  in `tsconfig.json`. Deleted rather than corrected — `babel-preset-expo` already resolves
  tsconfig paths and injects the worklets plugin, so the file bought nothing
- `metro.config.js` pointed `cssEntryFile` at `./global.css`; ours is `src/global.css`
- `src/global.css` is **replaced wholesale** by `init` on the UniWind path, not merged. The
  existing `--font-*` custom properties, read by `src/constants/theme.ts`, were restored and are
  also re-exported through `@theme inline` so `font-display` works as a utility
- `tsconfig.json` had `"./*"` appended to `@/*`; reverted
- the provider was inserted with `mode="dark"` hardcoded; now follows `useColorScheme()`

Components live in `src/components/ui/`, not the CLI default of `components/ui/`, matching the
`src/` layout this workspace already uses. Run the CLI from `mobile/`, never the repo root, and
never with `--monorepo` — that flag is for extracting a shared UI package and silently forces
NativeWind v4.

Verified by `tsc --noEmit` clean and by `expo export` on both iOS and web, with all
twenty-three components imported.

### Mobile navigation: Expo Router

File-based routing in `mobile/app/`, the default in the current `create-expo-app` template.

**This is not the same thing as Expo Router API routes.** Router-as-navigation is a client concern
and costs nothing extra. API routes (`+api.ts`) are a server, and were rejected as *the* backend —
Nest is the backend.

### Expo API routes: available, not enabled

Kept as an option a team member can turn on, rather than switched on now. Verified against current
Expo docs, 10 August 2026.

Turning them on is one line — `web.output: "server"` in `app.json` — and that line is why it is not
already there. It changes what the Expo build produces for every member, not just the one who
wanted an API route, and two further requirements follow it:

- production **native** builds need `origin` set in the expo-router plugin config, pointing at a
  deployed server, or relative `fetch` calls resolve to nothing on a real phone
- a Node server has to be deployed regardless — the "no separate backend" appeal is not real

To enable, when someone actually has a use for it:

```json
{ "web": { "output": "server" },
  "plugins": [["expo-router", { "origin": "https://<deployed-host>" }]] }
```

Then verify on a **physical device**, not the simulator — that is where the missing `origin` shows
up. Business logic belongs in `api/` either way; if an API route starts holding domain logic, the
two backends have begun to diverge and the shared zod schemas stop being the single definition.

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

### 1. Persistence

No database chosen. This is now the blocking question: Nest is settled, so the framework no longer
constrains the answer, and nothing can be built past a stub controller without it.

### 2. Authentication

Not designed. The app has at least three distinct roles (farmer, buyer, logistics provider) with
genuinely different permissions, so this is not a detail to bolt on late. Flagged here so nobody
assumes a decision exists.

---

## How to record a decision here

When one of the open questions is answered, move it into **Settled** with the reasoning — not just
the outcome. The outcome alone tells the next person *what* was chosen; the reasoning tells them
whether the choice still holds when circumstances change. If a decision is later reversed, say so
in place rather than deleting the old entry.
