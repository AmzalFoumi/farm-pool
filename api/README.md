# api

The FarmPool backend: **NestJS 11 + MongoDB (Mongoose)**, one module per domain, light DDD.
This file is the workspace's quick start; the reasoning lives in `.plans/` at the repo root.

## Run

Everything is installed from the repo root, never from inside this folder:

```bash
npm install                        # at the repo root, once; also builds packages/shared
cp api/.env.example api/.env       # then fill in DATABASE_URI and JWT_SECRET (the file says how)
npm run api                        # = npm run start:dev -w api; watch mode on 0.0.0.0:3000
```

The api refuses to start if a required variable is missing and prints which one
(`src/config/env.ts`). A phone on the same Wi-Fi reaches it at `http://<your LAN ip>:3000`.

Something to look at: `npm run seed:listings -w api` creates one farmer and eight verified
listings, safe to re-run.

## Scripts

| Command | What |
| ------- | ---- |
| `npm run start:dev -w api` | Watch mode |
| `npm run build -w api` | Compile to `dist/` (also a type check) |
| `npm run lint -w api` | ESLint, including the rule that keeps NestJS and Mongoose out of `domain/` |
| `npm test -w api` | Unit tests: use-cases over in-memory repositories, guards, hasher, signer |
| `npm run test:e2e -w api` | HTTP tests against an in-memory MongoDB (`mongodb-memory-server`, ~100 MB download on first run) |
| `npm run seed:listings -w api` | Dev seed; refuses to run with `NODE_ENV=production` |

After editing `packages/shared/src`, run `npm run build -w @farm-pool/shared` first: this
workspace compiles against the built `dist/`.

## Where things are

```
src/
├── main.ts, app.module.ts        bootstrap; every domain module + the DomainError filter
├── config/                       env validation (zod) — the only place process.env is read
├── database/                     the one Mongoose connection, from DATABASE_URI
├── shared/kernel/                DomainError — what a use-case throws
├── shared/http/                  ZodValidationPipe, DomainErrorFilter
├── identity/                     accounts, roles, JWT guard, @Allow — built
├── catalog/                      listings, wanted requests — built
├── orders/                       orders — built
├── coordination/, logistics/     scaffolds, not built
└── cli/                          one-off scripts (the dev seed)
test/                             e2e specs, one per domain
```

Each domain has a `README.md` with the same headings: what it owns, its layout, its endpoints,
one request walked through the files, and what other domains may reuse.

## Read before changing anything

| Question | Read |
| -------- | ---- |
| How do I add a domain or an endpoint? | `.plans/PLAYBOOK.md`, recipe 1 |
| What is in the database already? | `.plans/DATA-MODEL.md` |
| How do roles and route protection work? | `.plans/auth/README.md` |
| Why MongoDB, why Mongoose, why no DTO classes? | `.plans/DECISIONS.md` |
| How do I check a change works? | `.plans/VERIFY.md` |
