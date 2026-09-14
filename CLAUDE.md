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
| `mobile/` | Expo (React Native), managed workflow — the app. UI is **gluestack-ui v5** components styled by **UniWind** (Tailwind v4 `className` on React Native), over the FarmPool design system in `mobile/src/styles/` |
| `api/` | The backend. **Framework not yet chosen** — see `.plans/DECISIONS.md` |
| `packages/shared/` | Types and zod schemas imported by both sides |

What the app is functionally meant to do, for whom, and why: **`.plans/PRODUCT.md`**. This is
synthesized from research notes and prior lab submissions, not a signed-off spec — treat it as the
current best understanding, not something binding. Where it conflicts with a decision made
elsewhere (`.plans/DECISIONS.md`, Jira), the other source wins.
Full layout and the reasoning behind it: **`.plans/STRUCTURE.md`**.
Stack decisions and what is still open: **`.plans/DECISIONS.md`**.
How to check things work: **`.plans/VERIFY.md`**.
How to build UI: **the "Building UI" section below** — read it before writing any screen or component.

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
feat/FARM-12-listing-form
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

## Building UI

**This section applies to every prompt that produces a screen, a component, or a visual change.**
It is not optional context. A pull request that hard-codes a colour, a font size or a radius is
rejected on review, because four people each inventing "roughly the right green" is exactly the
drift the design system exists to stop.

### The three layers

```
gluestack-ui v5   components — Button, Input, Select, Actionsheet, Modal, Toast, FormControl…
                  copy-pasted into mobile/src/components/ui/, so the source is ours
      ↑
UniWind           styling engine — makes className="flex-row gap-2 bg-card" work on React Native
      ↑
Design system     tokens — mobile/src/styles/{colors,typography,layout}.css
```

They are layers, not alternatives. Reach for the highest one that does the job: an existing
gluestack component first, composed primitives (`Box`, `VStack`, `HStack`, `Text`) second, and a
hand-rolled `View` with `StyleSheet` essentially never.

### Where the system lives

| File | What is in it |
| ---- | ------------- |
| `mobile/src/styles/colors.css` | Brand ramps (`leaf`, `harvest`, `river`, `lilac`) and the semantic tokens (`background`, `card`, `primary`, `brand-deep`, `muted`, `border`, status colours) |
| `mobile/src/styles/typography.css` | The two font families and the `type-*` text styles |
| `mobile/src/styles/layout.css` | The radius scale, `min-h-tap`, `h-control`, `p-gutter`, `elevation-card` |
| `mobile/src/global.css` | Entry point. Imports the three above. Edit the token files, not this one |
| `mobile/src/components/design-system-preview.tsx` | Living reference — every token used once. Read it to see the system; it is not routed and does not ship |
| `mobile/src/components/app/` | Shared on-system components: `app-button.tsx`, and `icons.tsx` (Figma-exported SVGs, rendered verbatim) |

All of it is derived from the Figma file `YpAf6FAzdLDEf8g6ZPTZXU` — Typography (node `121:28499`),
Color Palette (node `121:28500`), welcome (`196:5544`), role picker (`196:5575`),
navigation (`196:6638`).

**Where the Figma file contradicts itself, the `196:*` screens win.** The palette and type frames are
older and disagree with the screens on the green, the neutrals and several radii. The semantic tokens
are set from the screens; `colors.css` records every overridden value and why. Check a token against
the screens before trusting the palette frame.

### The rules

**1. Never write a raw colour, size, radius or shadow.** No `#00B14F`, no `style={{ fontSize: 18 }}`,
no `color: "white"`, no `borderRadius: 12`. If a value seems to be missing from the system, it is
far more likely you are reaching for the wrong token than that the system has a gap — check
`design-system-preview.tsx` before concluding otherwise. Genuinely adding a token is a design-system
change: make it in `src/styles/`, say so, and note it in `.plans/DECISIONS.md`.

**2. Prefer semantic tokens over brand ramps.** Write `bg-primary`, not `bg-leaf-500`; `text-foreground`,
not `text-ink`; `bg-card`, not `bg-paper`. The semantic names flip with the theme and the ramps do
not, so a screen built on ramps is a screen that breaks in dark mode. The ramps are for genuinely
decorative colour — an illustration, a chart series — and nothing else.

**3. Typography is a lookup, not a judgement.** The Figma type style maps one-to-one onto a class:

| Figma | Class | Metrics | Used for |
| ----- | ----- | ------- | -------- |
| — | `type-display` | Poppins Bold 40/44 | the wordmark, nothing else |
| H1 | `type-h1` | Poppins Bold 30/36 | |
| H2 | `type-h2` | Poppins Bold 26/32 | |
| H3 | `type-h3` | Poppins Bold 22/28 | |
| — | `type-title` | Poppins Bold 20/25 | app-bar titles |
| H4 | `type-h4` | Poppins Bold 18/24 | card titles, button labels |
| Body Large | `type-body-lg` / `-bold` | Mulish 17/26 | |
| Body | `type-body` / `type-body-bold` | Mulish 15/22 | |
| — | `type-caption` / `-bold` | Mulish 14/20 | the line under a title, helper text |
| Body Small | `type-body-sm` / `-bold` | Mulish 13/18 | small print, tab labels |

The three steps marked `—` are not in the Figma type frame; the `196:*` screens use them and they
are recurring roles, so they were added to the ramp rather than hard-coded.

Each class sets family, size, line height and tracking, and deliberately sets **no colour** — pair it
with `text-foreground`, `text-muted-foreground`, `text-primary`, and so on.

Never add `font-bold` or `font-weight` to a `type-*` class. React Native does not resolve a weight to
a face the way a browser does, and Android will synthesise a fake bold that looks visibly wrong. The
bold styles are separate loaded faces, which is why `type-body-bold` exists as its own class.

**4. Every interactive element clears `min-h-tap` (48dp).** Put it on the element that receives the
tap — usually the whole row, not the icon inside it. FarmPool is used one-handed, outdoors, by people
with dirt on their hands; this is a functional requirement, and SE3050 assesses it. Full-width
commitment buttons use `h-control` (58dp) instead.

**5. Colour carries meaning here — use the right one.** `primary` is an action, `brand-deep` is a
surface. On the order lifecycle: `warning` is pending, `info` is in transit, `success` is delivered
or paid, `destructive` is cancellation and deletion. Do not use `harvest` for a destructive action —
it already means "pending", and a farmer confirming a cancellation must not see the same colour as an
order awaiting pickup.

**6. Check dark mode before claiming done.** The app follows `useColorScheme()`. Rule 2 gets this
right for free; rule 2 broken is where it shows up.

**7. Use the shared components before building your own.** `AppButton` (`src/components/app/`) is the
primary and secondary button; it exists because gluestack's `Button` bakes `rounded-md`, `min-h-8`
and `font-sans` into its tva base, and fighting those is where className merge order stops being
predictable. Icons come from `src/components/app/icons.tsx`, which holds the exact SVGs Figma
exported — do not redraw a glyph by hand or swap in a lookalike from an icon package.

**8. Figma positions absolutely; you must not.** Both onboarding screens are 393×852 frames with
every element at a fixed offset. Translate the *relationships* (this sits 16px below that; this
sheet is content-height and pinned to the bottom) into flex, and take the top and bottom insets from
`useSafeAreaInsets()`. A screen built from Figma's raw coordinates is broken on every device that is
not a 393×852 iPhone.

### A screen, correctly built

```tsx
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

<VStack className="flex-1 gap-3 bg-background p-gutter">
  <Text className="type-h2 text-foreground">Today's listings</Text>

  <HStack className="elevation-card min-h-tap items-center gap-3 rounded-card bg-card p-3">
    <VStack className="flex-1">
      <Text className="type-body-bold text-foreground">Tomatoes · 40 kg</Text>
      <Text className="type-body-sm text-muted-foreground">Kurunegala · posted 2h ago</Text>
    </VStack>
    <Box className="rounded-pill bg-warning-subtle px-3 py-1">
      <Text className="type-body-sm-bold text-warning">Pending</Text>
    </Box>
  </HStack>
</VStack>
```

### Routing shape

```
src/app/_layout.tsx      root Stack — fonts, providers, headerShown: false
src/app/index.tsx        "/"            Welcome        (Figma 196:5544)
src/app/sign-up-as.tsx   "/sign-up-as"  Role picker    (Figma 196:5575)
src/app/(tabs)/          "/home", "/explore"  the tab shell, entered after onboarding
```

Onboarding is the root stack, so a cold start lands on the welcome screen. The tab shell sits one
level in and is entered with `router.replace`, not `push` — otherwise Android's back button walks the
user back into sign-up after they have finished it. `(tabs)/home.tsx` is the old `app/index.tsx`; it
was renamed because a root `index` and a `(tabs)/index` both resolve to `/` and collide.

### Fonts

Poppins Bold, Mulish Regular and Mulish Bold are loaded by `useFonts()` in `mobile/src/app/_layout.tsx`.
The keys there are the family names the `type-*` classes resolve to — rename one and every heading in
the app silently falls back to the system font. Only those three cuts are loaded; each extra face is
~40 KB for users often on a rural 3G connection, so adding one is a deliberate decision, not a
convenience.

### When a gluestack component needs restyling

The components in `mobile/src/components/ui/` are ours — copy-pasted source, not a dependency — so
edit them directly rather than wrapping them. They already consume the semantic tokens, so most
"restyling" is really a token change in `src/styles/colors.css` that should be made once there
instead of overridden in one component. Re-running the gluestack CLI overwrites these files, so
component updates need reviewing rather than accepting blind.

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
