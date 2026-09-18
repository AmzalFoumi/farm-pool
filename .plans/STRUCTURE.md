# Structure

The monorepo layout and what each directory is for. Rules an agent must *follow* live in
`CLAUDE.md`; this file explains the shape those rules assume.

```
farm-pool/
├── .gitignore, README.md, CLAUDE.md, AGENTS.md
├── package.json                # npm workspaces root: mobile, api, packages/*
├── .claude/                    # shared agent config, committed
├── .plans/                     # committed: this file, DECISIONS.md, VERIFY.md, PRODUCT.md,
│   └── auth/README.md          #   and one folder per cross-cutting design (auth first)
├── .plans.local/               # gitignored — individual working records
├── CLAUDE.local.md             # gitignored — individual agent instructions
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── mobile/                     # Expo SDK 57, managed workflow
│   ├── src/
│   │   ├── app/                # expo-router — file-based routes
│   │   │   ├── _layout.tsx     # root layout (navigation container)
│   │   │   ├── (tabs)/         # route group: groups files without adding a URL segment
│   │   │   └── +not-found.tsx  # the "+" prefix marks special routes
│   │   ├── components/
│   │   ├── constants/
│   │   └── hooks/
│   ├── assets/images/
│   ├── app.json                # Expo config
│   ├── package.json, tsconfig.json
│   └── .gitignore              # written by create-expo-app — merge, never replace
├── api/                        # NestJS + TypeScript
│   ├── src/
│   │   ├── main.ts             # bootstrap: HOST/PORT from config, CORS on
│   │   ├── app.module.ts       # root module; config + database first, then the five domains
│   │   ├── config/             # env.ts (zod schema of the environment) + the Nest ConfigModule
│   │   ├── database/           # the one Mongoose connection, from DATABASE_URI
│   │   ├── shared/
│   │   │   ├── kernel/         # base classes reused across domains (no module)
│   │   │   └── http/           # ZodValidationPipe — shared schemas as request validation
│   │   └── <domain>/           # one per business capability, not per persona:
│   │       │                   #   identity, catalog, orders, logistics, coordination
│   │       ├── domain/         # entities, value-objects, repository INTERFACES — pure rules
│   │       ├── application/    # services (use-cases), ports (interfaces they need), errors
│   │       ├── infrastructure/ # persistence/ (Mongoose schema + repository), security/, …
│   │       ├── auth/           # identity only: guards + decorators other domains import
│   │       ├── <domain>.controller.ts
│   │       └── <domain>.module.ts
│   ├── test/                   # e2e specs + the in-memory MongoDB globalSetup
│   ├── .env.example            # every key the api reads; copy to .env (gitignored)
│   └── nest-cli.json, package.json, tsconfig.json
└── packages/shared/            # types + zod schemas used by both sides
    ├── src/index.ts            # barrel; src/identity/ holds the auth schemas + permissions
    ├── dist/                   # built output (gitignored) — what api/ imports
    └── package.json, tsconfig.json, tsconfig.build.json
```

Two things are absent from that tree on purpose.

**No `metro.config.js`.** Since SDK 52 `expo/metro-config` resolves workspace packages on its own,
and the Expo docs now say to *delete* the monorepo config older guides told you to add. If a
`packages/shared` import type-checks but fails to resolve at runtime, clear the Metro cache —
`npx expo start --clear` — rather than adding config back. `CLAUDE.md` carries this as a rule.

**Routes live in `src/app/`, not `app/`.** This is the current `create-expo-app` default, and
Expo's own resolver prefers it — `getRouterDirectory()` checks `src/app` before falling back to
`app`. The `@/*` alias in `mobile/tsconfig.json` points at `./src/*` to match. Do not move it: a
custom root is possible through the expo-router plugin's `root` option, but the docs discourage it
because tooling broadly assumes one of the two standard locations.

## Why it is shaped this way

### Three workspaces, not two

`packages/shared` exists because `mobile/` and `api/` both need the same types and the same
validation rules — a produce listing has the same fields whichever side is looking at it. The
alternative is defining them twice, which type-checks perfectly on both sides right up until they
disagree. Neither compiler can see the drift.

Put a type or zod schema there the moment a second workspace needs it. Not before — a shared
package with one consumer is indirection for its own sake.

#### The workspaces are still independent packages

npm workspaces is **dependency management on the developer's machine, not architecture**. Each of
the three keeps its own `package.json`, dependencies, scripts and tsconfig. What the root
`workspaces` key changes is where things get installed — one hoisted `node_modules` and one
lockfile — and it makes `@farm-pool/shared` resolve through a symlink rather than a registry
version.

Nothing here forecloses splitting later. Moving `api/` to its own repository is a directory copy
and an install; splitting it into several services means adding more workspaces, which is *easier*
in a monorepo than across repositories — the services keep importing one definition of the domain
instead of each drifting from its own copy. The symlink is the only thing a split has to resolve,
and the answer is either publishing `packages/shared` or bundling it at build time.

#### `packages/shared` builds to `dist/`; the two consumers read it differently

Settled 18 September 2026 at the first real shared import (FARM-33). The package's `main` and
`types` point at `dist/`, built by `tsc -p tsconfig.build.json` (CommonJS + declarations); its
`react-native` field points at `src/index.ts`, which Metro prefers, so the app keeps hot-reloading
source. This was option (1) of the two considered — a build step rather than `tsconfig` `paths`
in `api/` — because a built package still works if the repo is ever split, and a `paths` entry
into a directory that no longer exists does not.

The cost is the one to remember: **after editing `packages/shared/src`, rebuild before touching
`api/`** (`npm run build -w @farm-pool/shared`; a root `npm install` also does it via `prepare`).
A stale `dist/` is a type error in the api that points at the wrong place. `mobile/` never sees
this because it reads source.

### `api/` is NestJS, one module per domain, light DDD inside

Scaffolded with `nest new`. The generated `app.module.ts` is the root; five domain modules sit
beside it as siblings and are listed in its `imports`:

| Domain | Owns |
| ------ | ---- |
| `identity` | accounts, the four roles, permissions, verification |
| `catalog` | produce listings: crop, quantity, price, location, photos |
| `orders` | deals: quantity, agreed price, status from offer to accepted to fulfilled to paid |
| `logistics` | pickup, routing, maps, delivery tracking |
| `coordination` | farmer groups / cooperatives, the aggregated supply a coordinator represents |

**Domains are drawn by capability, not by persona.** farmer, buyer, coordinator and logistics
provider are *roles* — they live in `identity`, and every other domain acts on behalf of whichever
role is calling. A `Farmer` module would swell to hold listings, orders and payouts all at once,
while a `Buyer` module copied half of it; the copy then drifts. `coordination` is a domain rather
than a role because a coordinator takes independent action (managing a cooperative's combined
supply), not only acting for one farmer. Full reasoning: `DECISIONS.md`.

Inside each domain, **light DDD** — three layers:

- **`domain/`** — `entities/`, `value-objects/`, `repositories/`. The last holds *interfaces only*
  ("something that can store an order"). No NestJS, no database code. This is the layer that must
  never know which database was chosen.
- **`application/`** — `services/` (use-cases that orchestrate the domain), `ports/` (the
  interfaces a use-case needs that are not repositories — a password hasher, a token signer) and
  `errors.ts` (what the use-cases can refuse, as stable codes). Request and response shapes are
  the zod schemas in `packages/shared`, not DTO classes — a second definition here is the drift
  the shared package exists to prevent.
- **`infrastructure/`** — `persistence/` (the Mongoose schema and repository, plus an in-memory
  repository for tests) and whatever other adapters the ports need (`security/` in identity).

The `<domain>.module.ts` binds each interface to its implementation and registers the controller.
Use-cases are built with `useFactory` so they stay plain classes; the controller is thin — it
validates with `ZodValidationPipe(schema)`, calls a use-case and returns the result.

**The database is MongoDB via Mongoose** (`DECISIONS.md`, settled 18 September 2026). The
connection is opened once in `src/database/`; each domain registers its own collection with
`MongooseModule.forFeature` in its module. `domain/` and `application/` never import `mongoose`
or `@nestjs/*` — ESLint rejects it — so swapping a store is still one file in `infrastructure/`,
and the unit tests run against the in-memory repository with no database at all. This is the
main reason light DDD was chosen over flat Nest modules, and it is now enforced rather than
hoped for. `identity` is the worked example; `catalog` is next.

`shared/kernel/` holds base classes reused across domains (a base `Entity`, a `Result` type). It is
not a module — just types and helpers. Put something there only once a second domain needs it.

Request validation uses the zod schemas in `packages/shared`, **not** Nest's `ValidationPipe` with
`class-validator`. A second definition alongside the shared one recreates exactly the drift
`packages/shared` exists to prevent. See `DECISIONS.md`.

### `mobile/src/app/` is expo-router

File-based routing: a file at `src/app/listings/[id].tsx` becomes the route `/listings/:id`. Two
conventions that look like typos but are not:

- **`(tabs)/`** — parentheses make a *route group*. It organises files without contributing a URL
  segment, so `app/(tabs)/home.tsx` is `/home`, not `/(tabs)/home`.
- **`+not-found.tsx`** — a leading `+` marks a special route rather than a normal screen.

### Planning is split three ways

| Home | Committed | Holds |
| ---- | --------- | ----- |
| `CLAUDE.md`, `AGENTS.md` | yes | Rules an agent must follow, including commit and branch format |
| `.plans/` | yes | Decisions, structure, verification — the reasoning under those rules |
| `.plans.local/`, `CLAUDE.local.md` | **no** | Individual working records and personal agent instructions |

A fact is recorded **once**, in the home that owns it; the others link rather than restate. The
split exists because four people work here with different tools: the team needs the decisions, but
nobody needs anyone else's private notes or personal workflow imposed on them.

Committed files may reference `.plans/`. They may **not** reference `.plans.local/` — that path
does not exist in anyone else's checkout, and an agent chasing a dangling link is worse off than
one that never saw it.
