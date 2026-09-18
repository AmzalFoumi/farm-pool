# farm-pool

**Rural Farmer-to-Market Direct Connect** — a mobile marketplace connecting rural farmers directly
to market buyers, removing the middlemen who currently take a third of a smallholder's margin.

Group **SE-38** · SE3050 (User Experience Engineering) and SE3080 (Software Project Management).

## Stack

| Workspace | Stack |
| --------- | ----- |
| `mobile/` | Expo SDK 57 (React Native), managed workflow, expo-router; gluestack-ui v5 styled by UniWind over the FarmPool design tokens |
| `api/` | NestJS 11 + TypeScript, MongoDB via Mongoose, one module per domain (light DDD) |
| `packages/shared/` | TypeScript types and zod schemas shared by both sides |

npm workspaces monorepo. Layout and reasoning: [.plans/STRUCTURE.md](.plans/STRUCTURE.md).

## Prerequisites

- **Node.js 22.13 or newer** and npm 10+ (`node -v`, `npm -v`). Expo SDK 57 requires it; Node 20
  fails during install with an error that does not obviously name the cause.
- **Expo Go** on a physical Android or iOS device — the phone and the development machine must be
  on the same Wi-Fi network
- Git

No Android Studio or Xcode required. The managed workflow builds on Expo's servers, and the demo
path is Expo Go over the local network.

## Running the app

```bash
npm install          # once, from the repo root — installs every workspace and builds packages/shared
cp api/.env.example api/.env          # then fill in DATABASE_URI and JWT_SECRET (the file says how)
cp mobile/.env.example mobile/.env    # then set EXPO_PUBLIC_API_URL to this machine's LAN address
npm run api          # NestJS, watch mode, on 0.0.0.0:3000
npm run mobile       # Expo dev server
```

Optional, for something to look at: `npm run seed:listings -w api` creates one farmer and eight
verified listings (safe to re-run). Sign up as a buyer in the app and the Listings tab fills.

**After editing `packages/shared/src`, rebuild it** — `npm run build -w @farm-pool/shared` — before
touching `api/`. The api reads the built `dist/`; the app reads source and needs nothing.

**Install from the root, never from inside a workspace.** This is an npm workspaces monorepo: the
root install resolves `mobile/`, `api/` and `packages/*` together into one `package-lock.json`.
Running `npm install` inside `mobile/` or `api/` creates a second, competing lockfile and a nested
`node_modules` that shadows the shared one.

Scan the QR code with Expo Go. If the app fails to load, confirm the phone is on the same network —
the development server is reachable at the machine's LAN IP, not `localhost`.

## Working here

Read [CLAUDE.md](CLAUDE.md) before your first commit — it carries the commit format, the branch
format, and what must never enter this repository. It applies to humans and AI agents alike.

Commits: `<type>(<scope>): FARM-n <subject>` · Branches: `feat/FARM-12-listing-form`

The `FARM-n` key is what links a commit to its Jira work item. Omit it and the work disappears from
Jira's Development panel.

Work lands on `main` through pull requests, each reviewed by another member.

## Links

| | |
| ---- | --- |
| Jira space | [_link_ ](https://tharushi742.atlassian.net/jira/software/projects/FARM/summary)|

## Where things are explained

| Question | Read |
| -------- | ---- |
| What is the app for, and for whom? | [.plans/PRODUCT.md](.plans/PRODUCT.md) |
| Why is the repo shaped like this? | [.plans/STRUCTURE.md](.plans/STRUCTURE.md) |
| How do I add an endpoint, a screen, a shared type? | [.plans/PLAYBOOK.md](.plans/PLAYBOOK.md) |
| What is in the database already? | [.plans/DATA-MODEL.md](.plans/DATA-MODEL.md) |
| Why this library and not that one? | [.plans/DECISIONS.md](.plans/DECISIONS.md) |
| How do sign-up, login and roles work? | [.plans/auth/README.md](.plans/auth/README.md) |
| How do I check my change works? | [.plans/VERIFY.md](.plans/VERIFY.md) |
| What does one api domain own and expose? | `api/src/<domain>/README.md` |
