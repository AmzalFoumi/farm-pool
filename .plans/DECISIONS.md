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

**DB-agnostic by interface, not by abstinence** (amended 18 September 2026, when persistence was
settled — see below): the database is now MongoDB via Mongoose, and each domain's
`infrastructure/persistence/` holds its schema and repository implementation. `domain/` and
`application/` still import nothing from `mongoose` or `@nestjs/*` — that is now an ESLint error
(`api/eslint.config.mjs`), not a convention — so the layer boundary the light-DDD split was chosen
for is enforced rather than hoped for.

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

### Mobile design system: Figma tokens in CSS, not a TypeScript theme object

Decided 12 September 2026, amended 13 September on building the first two screens. Lives in
`mobile/src/styles/` as three CSS files — `colors.css`, `typography.css`, `layout.css` — imported by
`src/global.css`. Derived from the Figma file `YpAf6FAzdLDEf8g6ZPTZXU`. The rules for using it are in
`CLAUDE.md` → "Building UI".

**Why CSS rather than an exported `theme.ts`.** A TypeScript constants object would have to be
imported and threaded into every style, and it cannot be read by a `className`. UniWind compiles
Tailwind v4 CSS, so tokens declared in `@theme` become utility classes directly. The decisive point
is that **the twenty-three gluestack components already consume the semantic names** (`background`,
`card`, `primary`, `muted`, `border`, `ring`). Re-pointing those names at the FarmPool palette
re-skins Button, Input, Select and Badge in one edit; a parallel `theme.ts` would have left them on
the CLI's default black-and-white and created a second source of truth.

**Two layers, deliberately.** Raw brand ramps (`leaf`, `harvest`, `river`, `lilac`) are static and
hold the actual hues. Semantic tokens (`primary`, `card`, `brand-deep`, `muted`,
`success`/`warning`/`info`/`destructive`) flip with the theme and are what app code uses. Building
screens on the ramps instead is what breaks dark mode, so `CLAUDE.md` states the preference as a rule
rather than a suggestion.

Semantic values are stored as `R G B` triplets rather than hex so Tailwind's slash syntax works —
`bg-primary/10`. A hex would make every opacity modifier in the app silently no-op.

**Type styles name the font face, never a weight.** `type-h1` sets `font-family: Poppins_700Bold` and
no `font-weight`. React Native does not resolve a weight to a face the way a browser does; Android
synthesises a fake bold that is visibly wrong beside real Poppins Bold. Hence `type-body` and
`type-body-bold` as separate classes rather than one class plus `font-bold`. Poppins Bold, Mulish
Regular and Mulish Bold are loaded via `@expo-google-fonts/*` in `src/app/_layout.tsx`; only those
three cuts, because each additional face is ~40 KB for users often on rural 3G.

**The Figma file contradicts itself, and the screens win.** The palette and type frames (`121:*`) are
older than the screens (`196:*`) and disagree with them:

| | Palette / type frames | The screens |
| --- | --- | --- |
| Green surface | `#0D3B2E` | `#1E6B48` |
| Mint tint | `#E3F9EC` | `#E3EFE8` |
| Screen background | `#F2F2F2` | `#F9F8F6` |
| Secondary text | `#8A8A8A` | `#5A625C` |
| Card / button radius | 12 / 10 | 16 / 14 |

The `196:*` nodes are the newest artefacts; the earlier onboarding frame (`184:19`) already used
`#1E6B48`, so the screens agree with each other and the palette frame is the outlier; and the screens
are what a reviewer will hold the built app against. The semantic tokens follow the screens, and the
raw ramps kept both values (`leaf-50` is the palette's mint, `leaf-100` the screens'), so reversing
this is a handful of edits in one block rather than a hunt through every screen — which is the whole
reason the two layers are separate. **Still to confirm with the designer.**

Not reconciled: the screens' `#00B34F` primary against the palette's `#00B14F`, two steps in one
channel and below the threshold of visible difference.

**Three colours were invented, and it is worth knowing which.** The Figma palette names thirteen
colours and none of them is a hairline, a body-text ink or a red:

- `--border` `#E2E0DC` — taken from the screens, which the palette frame has no equivalent for
- `--foreground` `#191F1B` — the one value both sources agree on
- `--destructive` `#C82F2A` — harvest orange could not carry it, because orange already means
  "order pending" and a cancellation confirmation must not look like an order awaiting pickup

Added when the screens needed them, each a recurring role rather than a one-off: `type-display`
(40/44), `type-title` (20/25, app-bar titles), `type-caption` (14/20), `--radius-chip`/`-tile`/
`-sheet`, `--spacing-control` 58px, and the `lilac` ramp for the wholesale-buyer persona tile.

**Accepted cost:** `gluestack-ui init` replaces `src/global.css` wholesale on the UniWind path, so
re-running the CLI drops the three `@import` lines. The token files themselves survive, and the
header comment in `global.css` says what to restore.

**Light is the designed theme.** FarmPool is used outdoors in daylight. The dark variant exists so
`useColorScheme() === "dark"` does not produce an unreadable app; it is a faithful inversion, not a
separately designed theme, and the brand green is lifted there because the flat `#00B14F` does not
read as an action on a dark card.

Verified by `tsc --noEmit` clean, `expo export` on web and iOS, and by grepping the emitted CSS to
confirm each token produces the utility class it is supposed to.

### Mobile onboarding: root stack, tabs one level in

Decided 13 September 2026, building the welcome and role-picker screens (Figma `196:5544`,
`196:5575`). They are the first thing on app open, so onboarding is the root stack and the tab shell
moved from the root layout into `src/app/(tabs)/`. The old `app/index.tsx` became `(tabs)/home.tsx` —
a root `index` and a `(tabs)/index` both resolve to `/` and collide — and the tab triggers were
renamed `index` → `home` on both the native and web variants of `AppTabs`.

The role picker is entered with `push` and leaves with `replace`, so Android's back button does not
walk a user back into sign-up after they have completed it.

**Figma's absolute coordinates are not reproduced.** Both frames are 393×852 with every element at a
fixed offset. Only the relationships are kept, in flex, with safe-area insets from
`useSafeAreaInsets()`. A screen built from the raw coordinates is broken on every device that is not
a 393×852 iPhone.

**Two deviations from the mock, both deliberate.** The frame shows "Delivery partner" already
selected, because a static mock has to show the selected state somewhere; a real first visit has
nothing selected, so the footer button starts disabled and its label ("Continue as delivery partner")
is treated as a template. And the welcome screen's "Log in" button is inert — there is no log-in
screen yet. It is left visible because removing it would make the screen read as sign-up-only, which
is not the intent.

**Icons are the Figma exports, not an icon package.** `src/components/app/icons.tsx` holds the exact
SVG bytes for all eleven glyphs, rendered through `react-native-svg`'s `SvgXml`. That avoids adding
`react-native-svg-transformer` and the Metro config change it needs, which this file elsewhere says
not to make. Figma exported the mail glyph as two separately-positioned vectors; both path strings
are unaltered and the group translates reproduce Figma's exact offsets.

**Not verified on hardware.** Both screens are confirmed by `tsc`, `expo export` on web and iOS, and
by server-rendering both routes — but layout under real safe-area insets has not been seen on a
device.

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

### Persistence: MongoDB Atlas via Mongoose

Decided 18 September 2026 (FARM-33). Was open question 1.

**Why MongoDB.** The team already had an Atlas cluster and a working connection string before the
question was formally answered; the decision here mostly records that and makes it deliberate.
The substantive reasons it holds up: Atlas is hosted, so nobody installs a database on a machine
split across Windows and macOS, and the free tier covers a coursework project. The data shape is
document-friendly — a listing with photos and a location, an order with a status history — and
there are no cross-aggregate joins in the current product scope that would argue for SQL.

**Why Mongoose rather than the bare driver or Prisma.** Mongoose gives a schema with enum
validation at the database edge (the `role` and `status` columns read their allowed values from
`packages/shared`, so the database cannot hold a value the app does not know), unique indexes
declared next to the field, and `@nestjs/mongoose` for wiring. Prisma's MongoDB support is real but
adds a generate step and a second schema language for no gain here.

**What the light-DDD layering buys now.** `UserRepository` is an interface in `domain/`; the
Mongoose implementation is one file in `infrastructure/persistence/`, and an in-memory
implementation backs the unit tests. Use-cases are tested without a database, and the e2e suite
boots a real MongoDB in memory (`mongodb-memory-server`) from a Jest `globalSetup`, so
`npm run test:e2e -w api` needs nothing installed.

**Version pins worth knowing.** `@nestjs/config` 4 and `@nestjs/mongoose` 11, not the 12 line,
which is ESM-only while the api is CommonJS (see open question 3). `mongoose` is `~9.9`: 9.10 pulls
MongoDB driver 7.6.0, whose connection handshake fails inside Jest
(Automattic/mongoose#16499); lift the pin when that closes.

**Accepted cost.** Atlas needs the internet; a demo on a venue network with no outbound access
would need a local `mongod` and a different `DATABASE_URI`, which is an environment change, not a
code change. The credential lives only in `api/.env` (gitignored); rotate it in Atlas if it is ever
pasted anywhere.

### Authentication: phone + password, one JWT, roles from a shared matrix

Decided 18 September 2026 (FARM-34). Was open question 2. The mechanics are in `auth/README.md`;
this entry is the why.

**Credential: phone + password. Email later. No OTP.** The users are rural farmers and the traders
who buy from them; a phone number is the identifier they already give each other, and many have no
email. OTP by SMS was the obvious alternative and was deferred, not rejected: it needs a paid
gateway and a Sri Lankan sender id, and neither is available inside the module. The schema keeps
the door open — `users.email` exists with a sparse unique index, and login takes an `identifier`
rather than a `phone` — so email can be switched on without a migration or a request-shape change.

**All four roles self-register.** An earlier draft had coordinators seeded by script because they
are a trust checkpoint. Overruled: the sign-up flow shows four paths, and each role's own
onboarding is built by the developer owning that role. Vetting is the `status` field's job
(`pending_review` exists in the enum, and no guard enforces it yet — a follow-up story).

**One 30-day access token, no refresh token, no server-side session.** The simplest thing that
gives "stay signed in across restarts". Cost, stated plainly: a token cannot be revoked before it
expires, and a role or status change is invisible until re-login. Both upgrade paths (refresh
tokens; a `tokenVersion` check) sit behind the `TokenSigner` port and are described in
`auth/README.md`. Chosen because the audience is not an attack target worth a session store yet,
and because the app calls `/identity/me` on every cold start, which catches a deleted account.

**Permissions as data, in `packages/shared`.** `PERMISSIONS` maps actions to roles; the api's
`RolesGuard` reads it via `@Allow(action)`, the app reads it via `can(role, action)`. One table,
so "who gets a 403" and "who sees the button" cannot disagree — the same drift argument that
justifies the shared package at all.

**The core is framework-free, and ESLint enforces it.** The register/login/me/list use-cases are
plain classes in `application/`, built by Nest with `useFactory` and buildable by anything else
with `new`. `@nestjs/*`, `mongoose` and `express` imports under `domain/` and `application/` are
lint errors. This is what makes "runs under NestJS today or Expo API routes later" a property of
the code rather than an intention; `auth/README.md` shows the API-route version.

**Libraries.** Hashing is `node:crypto` scrypt (no native build, unlike `bcrypt`, which matters
on a mixed Windows/macOS team). Tokens are `jsonwebtoken` (HS256, algorithm pinned on verify).
`jose` was the first choice and was dropped only because v6 is ESM-only and the api is CommonJS
(open question 3); the `TokenSigner` port makes it a one-file swap. `@nestjs/jwt` was rejected
because it would put a Nest import behind the port. Nest's `ValidationPipe` is not used; a small
`ZodValidationPipe` runs the shared schemas, per the earlier decision.

**Not done, deliberately.** Rate limiting on the two public routes (add `@nestjs/throttler`
before any public deployment), password reset, OTP. Listed in `auth/README.md`.

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

*Persistence* and *Authentication*, formerly questions 1 and 2, were settled on 18 September 2026
and moved above. The remaining questions are renumbered.

### 1. Iconography beyond the Figma exports

Surfaced 14 September 2026, building the temporary wholesale-buyer screens (FARM-22). Two related
gaps, neither closed here.

**The tab bar uses OS symbol sets, not brand icons.** `src/components/app-tabs.tsx` uses
`NativeTabs` from `expo-router/unstable-native-tabs`. Its `NativeTabs.Trigger.Icon` cannot take a
React component, so the FarmPool SVGs in `src/components/app/icons.tsx` are unusable there. It does
accept `sf` (SF Symbols, iOS) and `md` (Material Symbols, Android) alongside `src={require(...)}`,
and all five tabs use the `sf`/`md` pair.

That is a placeholder, chosen because it needs no assets and touches nothing else: these are the
operating system's glyphs, not the design system's. The tab bar therefore does not look like the
Figma navigation frame (`196:6638`) and is not meant to yet.

Two ways to finish it, and the choice belongs with whoever owns the design system:

1. **Export five PNG triples from Figma** and swap each `sf`/`md` pair for one
   `src={require(...)}`. One line per tab, keeps the platform-native bar and its OS-correct
   behaviour, and gets the brand glyphs. This is the expected path.
2. **Move to expo-router's JS `Tabs`**, which takes a `tabBarIcon` render function. That would let
   the bar render the existing SVG components and use semantic tokens for the active state — but it
   replaces a native bar with a JS one for the whole team, which is a real trade and not one to make
   as a side effect of building a screen.

`assets/images/tabIcons/home.png` and `explore.png` are now unreferenced. They are left in place
rather than deleted, because option 1 puts files back in that directory.

**Android allows at most five tabs.** The buyer shell is at exactly that limit. A sixth destination
cannot simply be added — it needs a "More" screen, or the tab bar has to leave `NativeTabs`. Expo's
docs are explicit that exceeding five breaks the Material tab component with no fallback.

**No icon library is installed, and that is the position, not an accident.** There is no
`lucide-react-native`, no `@expo/vector-icons` — only `react-native-svg`. Two icon sets already
exist: the ten Figma exports in `src/components/app/icons.tsx` (`SvgXml`, stroke colours baked in,
so `text-*` will not recolour them), and ~45 vendored gluestack icons in `src/components/ui/icon/`
(drawn with `react-native-svg` `Path` through `createIcon`, routed through `tva` + `withUniwind`, so
these **do** recolour from `className`).

`lucide-react-native` was considered for the buyer screens and rejected. Between the two existing
sets, exactly one needed glyph was missing — a grid icon for the listings view toggle. Pulling in
~1,500 icons for one glyph is poor value, the result would look identical to what is already
vendored (gluestack's set *is* lucide artwork redrawn — `ChevronsUpDown`, `GripVertical` and
`Repeat1` are lucide names), and lucide's components take a `color` prop rather than `className`,
so every use would read a token into JS and pass a raw colour — which the "Building UI" rules in
`CLAUDE.md` forbid outright.

The grid affordance is therefore composed from four small `Box` squares in a 2×2 rather than
imported. If a later screen needs several genuinely absent glyphs, reopen this — but reopen it
here, with the `className` problem answered, rather than by running `npm install`.

### 2. `tertiary` — a third action rank, and its contrast

Added 14 September 2026, building the listing detail screen (FARM-22). **The token exists; what is
open is whether its light-mode value should stay.**

The listing detail screen ends in two footer buttons: "Request call" (outlined, quiet) and "Book
pickup" (filled orange, as the wireframe draws it). Orange had no semantic token. The only one
holding that hue is `warning`, which means *order pending* on the lifecycle, and rule 5 in
`CLAUDE.md` exists precisely to stop a status colour being borrowed as a brand colour — a farmer
must not see "awaiting pickup" orange on a button that books one.

`--tertiary` / `--tertiary-foreground` in `src/styles/colors.css` is therefore a **rank**, not a
status: primary is what the screen is asking for, tertiary is a real commitment the user may make
instead. It holds the same hue as `warning` today and is still a separate variable, so re-pointing
one never silently re-points the other.

What is unresolved is the light-mode pairing. White on `#F5821F` is about 2.9:1. At button-label
size (18px bold) the applicable WCAG bar is 3:1 rather than 4.5:1, so it scrapes through as a large
text control — but this app is used outdoors in direct sunlight by people who are not looking
carefully, which is the condition where a thin ratio actually fails. Dark mode has no such problem:
it steps down to `harvest-200` with ink text, about 8.9:1.

Three ways out, for whoever owns the design system:

1. **Dark text on the orange in light mode too** — `#191F1B` on `#F5821F` is about 8.3:1. One line,
   and it stops matching the wireframe.
2. **Darken the orange** until white clears 4.5:1, which means somewhere near `#C25A00` and is no
   longer the brand's harvest.
3. **Leave it.** Defensible — `primary` (`#00B14F` with white, about 2.4:1) is already in the same
   position across the whole app, so fixing tertiary alone would make it the odd one out. If the
   answer is "leave it", the honest version of that is to look at `primary` at the same time.

Option 3 is why this is recorded rather than quietly fixed: the button is not the problem, the
convention is, and that is a decision for the group.

### 3. `api/` is CommonJS; the Nest ecosystem is moving to ESM

Surfaced 18 September 2026, during FARM-33/34. The `nest new` scaffold compiles to CommonJS
(`module: nodenext` with no `"type": "module"`), and Jest runs it through `ts-jest` as CommonJS.
Three packages have already been chosen around that constraint:

- `@nestjs/config` 4 and `@nestjs/mongoose` 11 rather than their 12 lines, which ship
  `"type": "module"` and fail to load under CommonJS Jest (`SyntaxError: Unexpected token 'export'`)
- `jsonwebtoken` rather than `jose` 6 (ESM-only), for the same reason

Each pin is a small cost today and a growing one: the 11/4 lines will stop receiving features.
The migration is a platform change — `"type": "module"` in `api/package.json`, ESM output from
`tsc`, and either Jest's ESM mode (`--experimental-vm-modules`, still flagged) or a different
runner such as Vitest — and it touches every developer's setup, so it is a group decision rather
than something to slip into a feature branch. Node 22.12+ can `require()` an ES module, which
means the *runtime* would already cope; it is the test runner that would not.

When it is taken: swap `JsonwebtokenTokenSigner` for a `jose` adapter behind the same port, and
lift the `@nestjs/config` / `@nestjs/mongoose` pins in the same change.

---

## How to record a decision here

When one of the open questions is answered, move it into **Settled** with the reasoning — not just
the outcome. The outcome alone tells the next person *what* was chosen; the reasoning tells them
whether the choice still holds when circumstances change. If a decision is later reversed, say so
in place rather than deleting the old entry.
