# farm-pool

**Rural Farmer-to-Market Direct Connect** — a mobile marketplace connecting rural farmers directly
to market buyers, removing the middlemen who currently take a third of a smallholder's margin.

Group **SE-38** · SE3050 (User Experience Engineering) and SE3080 (Software Project Management).

## Stack

| Workspace | Stack |
| --------- | ----- |
| `mobile/` | Expo (React Native), managed workflow, expo-router |
| `api/` | Backend — **framework not yet chosen**, see [.plans/DECISIONS.md](.plans/DECISIONS.md) |
| `packages/shared/` | TypeScript types and zod schemas shared by both sides |

npm workspaces monorepo. Layout and reasoning: [.plans/STRUCTURE.md](.plans/STRUCTURE.md).

## Prerequisites

- **Node.js 20 LTS or newer** and npm 10+ (`node -v`, `npm -v`)
- **Expo Go** on a physical Android or iOS device — the phone and the development machine must be
  on the same Wi-Fi network
- Git

No Android Studio or Xcode required. The managed workflow builds on Expo's servers, and the demo
path is Expo Go over the local network.

## Running the app

> **Not yet scaffolded.** The workspaces are placeholders until the setup gate that runs the
> generators. Until then the commands below will not resolve — this section documents the intended
> entry point so it is not invented differently by four people.

```bash
npm install          # once, from the repo root — installs every workspace
npm run mobile       # or: npx expo start --cwd mobile
```

Scan the QR code with Expo Go. If the app fails to load, confirm the phone is on the same network —
the development server is reachable at the machine's LAN IP, not `localhost`.

The backend is not scaffolded yet; nothing in `api/` runs.

## Working here

Read [CLAUDE.md](CLAUDE.md) before your first commit — it carries the commit format, the branch
format, and what must never enter this repository. It applies to humans and AI agents alike.

Commits: `<type>(<scope>): FARM-n <subject>` · Branches: `feature/FARM-12-listing-form`

The `FARM-n` key is what links a commit to its Jira work item. Omit it and the work disappears from
Jira's Development panel.

Work lands on `main` through pull requests, each reviewed by another member.

## Links

| | |
| ---- | --- |
| Jira board | _added once the board is live_ |
| Confluence space | _added once the space exists_ |

## Verifying a change

[.plans/VERIFY.md](.plans/VERIFY.md) lists the checks and, for each, the failure it catches.
