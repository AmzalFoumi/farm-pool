# Structure

The monorepo layout and what each directory is for. Rules an agent must *follow* live in
`CLAUDE.md`; this file explains the shape those rules assume.

```
farm-pool/
├── .gitignore, README.md, CLAUDE.md, AGENTS.md
├── package.json                # npm workspaces root
├── tsconfig.base.json
├── .claude/                    # shared agent config, committed
├── .plans/                     # committed: this file, DECISIONS.md, VERIFY.md
├── .plans.local/               # gitignored — individual working records
├── CLAUDE.local.md             # gitignored — individual agent instructions
├── .github/
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── mobile/                     # Expo, managed workflow
│   ├── app/                    # expo-router — file-based routes
│   │   ├── _layout.tsx         # root layout (navigation container)
│   │   ├── (tabs)/             # route group: groups files without adding a URL segment
│   │   └── +not-found.tsx      # the "+" prefix marks special routes
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── assets/{images,fonts}/
│   ├── app.json                # Expo config
│   ├── metro.config.js         # patched for monorepo symlink resolution
│   ├── package.json, tsconfig.json
│   └── .gitignore              # written by create-expo-app — merge, never replace
├── api/                        # the backend — framework not yet chosen
│   └── .gitkeep                # placeholder; see DECISIONS.md open question 3
└── packages/shared/            # types + zod schemas used by both sides
    ├── src/index.ts
    └── package.json, tsconfig.json
```

## Why it is shaped this way

### Three workspaces, not two

`packages/shared` exists because `mobile/` and `api/` both need the same types and the same
validation rules — a produce listing has the same fields whichever side is looking at it. The
alternative is defining them twice, which type-checks perfectly on both sides right up until they
disagree. Neither compiler can see the drift.

Put a type or zod schema there the moment a second workspace needs it. Not before — a shared
package with one consumer is indirection for its own sake.

### `api/` is deliberately empty

It holds a `.gitkeep` and nothing else. The backend framework is an open decision, recorded in
`DECISIONS.md`. Nothing else in the repo depends on the answer, so there is no cost to leaving it
open — and guessing wrong costs a re-scaffold.

### `mobile/app/` is expo-router

File-based routing: a file at `app/listings/[id].tsx` becomes the route `/listings/:id`. Two
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
