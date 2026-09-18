# mobile

The FarmPool app: **Expo SDK 57** (React Native, managed workflow), file-based routing with
expo-router, UI built from **gluestack-ui v5** components styled by **UniWind** over the FarmPool
design tokens. This file is the workspace's quick start; the rules for building screens are in
the root `CLAUDE.md`, "Building UI", and the reasoning in `.plans/`.

## Run

Everything is installed from the repo root, never from inside this folder:

```bash
npm install                              # at the repo root, once
cp mobile/.env.example mobile/.env       # set EXPO_PUBLIC_API_URL to this machine's LAN address
npm run api                              # the backend, in another terminal
npm run mobile                           # = expo start; press a for Android, i for iOS
```

`localhost` on a phone is the phone, so `EXPO_PUBLIC_API_URL` must be the development machine's
address on the same Wi-Fi (`ipconfig` / `ifconfig`). Restart `expo start` after changing it: the
value is inlined at build time.

If an import from `@farm-pool/shared` type-checks but fails at runtime, clear the Metro cache
with `npx expo start --clear`. Do not add monorepo settings to `metro.config.js`; since SDK 52
Expo resolves workspace packages itself, and the file exists only for UniWind.

**Do not run `npm run reset-project`.** It is the Expo template's script for wiping a fresh app
and would move this project's `src/app` aside.

## Scripts

| Command | What |
| ------- | ---- |
| `npm run mobile` (root) or `npm start -w mobile` | Expo dev server |
| `npm run android -w mobile`, `npm run ios -w mobile` | Same, opening an emulator or simulator |
| `npm run lint -w mobile` | ESLint (`expo lint`) |
| `npx tsc --noEmit -p mobile` | Type check |

There is no test runner in this workspace yet; the emulator walk-throughs in `.plans/VERIFY.md`
are the manual check.

## Where things are

```
src/
├── app/                  routes (expo-router). _layout.tsx holds fonts, providers and the two
│   │                     Stack.Protected groups; see CLAUDE.md "Routing shape" for the list
│   ├── (tabs)/           home, listings, map, calls, profile
│   ├── listing/[id].tsx  detail + Place order sheet
│   ├── orders/           my orders, order detail
│   └── wanted/           my requests, new request
├── features/<domain>/    api.ts (apiFetch + zod parse) and the pieces only that feature uses
├── lib/                  apiFetch + ApiError, auth-api, useRequest, format, session-storage
├── providers/            auth-provider.tsx — session, token, role
├── components/ui/        gluestack-ui v5, vendored: ours to edit, re-running the CLI overwrites
├── components/app/       on-system shared pieces: AppButton, AppBar, AppTextField, RequestView,
│                         PlaceholderScreen, icons (Figma SVGs, verbatim)
├── components/design-system-preview.tsx   every token used once; not routed
├── styles/               colors.css, typography.css, layout.css — the design tokens
└── global.css            imports the three token files; edit the token files, not this one
```

A screen in `app/` composes `features/`, `lib/` and `components/` and holds no fetch code of its
own. Worked example: `app/orders/index.tsx`.

## Read before changing anything

| Question | Read |
| -------- | ---- |
| Which classes, tokens and components may I use? | root `CLAUDE.md`, "Building UI" |
| How do I add a screen that talks to the api? | `.plans/PLAYBOOK.md`, recipe 2 |
| How do sign-up, login and the session work? | `.plans/auth/README.md` |
| Why NativeTabs, why UniWind, what is still open? | `.plans/DECISIONS.md` |
| The versioned Expo docs for this SDK | https://docs.expo.dev/versions/v57.0.0/ (see `AGENTS.md` here) |
