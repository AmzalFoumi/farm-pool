# Structure

The monorepo layout and what each directory is for. Rules an agent must *follow* live in
`CLAUDE.md`; this file explains the shape those rules assume.

```
farm-pool/
├── .gitignore, README.md, CLAUDE.md, AGENTS.md
├── package.json                # npm workspaces root: mobile, api, packages/*
├── .claude/                    # shared agent config, committed
├── .plans/                     # committed: this file, DECISIONS.md, VERIFY.md
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
│   │   ├── main.ts             # bootstrap
│   │   └── app.module.ts       # root module; feature modules are siblings
│   ├── test/                   # e2e specs (unit specs sit beside their source)
│   └── nest-cli.json, package.json, tsconfig.json
└── packages/shared/            # types + zod schemas used by both sides
    ├── src/index.ts
    └── package.json, tsconfig.json
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

### `api/` is NestJS, one module per feature

Scaffolded with `nest new`. The generated `app.module.ts` is the root; feature modules sit beside
it as siblings — `listings/`, `orders/`, `auth/` — each with its own controller, service and
module. That boundary is the point: it is what gives each member a slice they can own and explain,
rather than four people editing the same router file.

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
