# Playbook — how to add things the way the existing code does

Recipes for the four things every story needs: an api endpoint, a mobile screen, a shared type,
and a README. Each one names the real files to copy from, so nobody starts from a blank page or
invents a second way of doing the same thing.

The rule behind all of them: **if a flow already exists, extend it; do not write a parallel one.**
`identity`, `catalog` and `orders` in `api/src/` and `features/orders` in `mobile/src/` are the
worked examples. When a recipe here and the code disagree, the code is newer; fix the recipe.

Read alongside: `.plans/STRUCTURE.md` (why the repo is shaped like this), `.plans/DATA-MODEL.md`
(what is stored already), `.plans/auth/README.md` (roles and how a route is protected), and the
"Building UI" section of `CLAUDE.md` (design tokens; not optional for any screen).

## The shape of one feature, end to end

```
packages/shared/src/<domain>/<thing>.ts     zod object  ──┐  one definition, both sides
                                                          │
api/src/<domain>/                                         │
  domain/entities/<thing>.ts                 entity + to<Thing>Dto     ◀── reads the zod type
  domain/repositories/<thing>.repository.ts  interface + Symbol token
  application/services/<verb-thing>.ts       use-case: the rules
  application/errors.ts                      <Domain>Error extends DomainError
  infrastructure/persistence/<thing>.schema.ts          Mongoose class (enums from zod)
  infrastructure/persistence/mongoose-<thing>.repository.ts
  infrastructure/persistence/in-memory-<thing>.repository.ts   for unit tests
  <domain>.controller.ts                     @Allow + ZodValidationPipe → use-case
  <domain>.module.ts                         forFeature + useFactory
                                                          │
mobile/src/                                               │
  features/<domain>/api.ts                   apiFetch(path, { schema })  ◀── same zod object
  features/<domain>/<piece>.tsx              presentational pieces only this feature uses
  app/<route>.tsx                            screen: useRequest → RequestView → pieces
```

A request travels: screen → `features/<domain>/api.ts` → `apiFetch` → controller → use-case →
repository → Mongoose → back through `to<Thing>Dto` → validated by the same zod schema in the app.
Each domain README has a **Flow** section that walks one endpoint through those files.

## Recipe 1 — Add an api domain or endpoint

Worked example: `api/src/catalog/` (two collections, five endpoints). Copy from it, not from
`identity`, which predates the shared error filter.

1. **Shape first, in shared.** Add or extend the zod object in `packages/shared/src/<domain>/`.
   Export it from `packages/shared/src/index.ts`. Rebuild: `npm run build -w @farm-pool/shared`.
   Recipe 3 has the rules.
2. **Entity and mapper.** `domain/entities/<thing>.ts`: the domain type (usually the shared type
   plus nothing) and `to<Thing>Dto`, which is what the controller returns. Example:
   `catalog/domain/entities/listing.ts`.
3. **Repository interface.** `domain/repositories/<thing>.repository.ts`: an interface with only
   the methods the use-cases need, plus `export const THING_REPOSITORY = Symbol('ThingRepository')`.
   No Mongoose here; ESLint rejects a `mongoose` or `@nestjs/*` import under `domain/`.
4. **Use-case.** One class per verb in `application/services/<verb-thing>.ts`, constructor takes
   the repository interface(s), one `execute()`. Rules that zod cannot express live here (an
   order's quantity against a listing's range). Refuse with `throw new <Domain>Error(kind, code,
   message)`. Example: `orders/application/services/place-order.ts`.
5. **Errors.** `application/errors.ts`: a union of stable codes and a subclass of `DomainError`
   from `api/src/shared/kernel/domain-error.ts`. The `kind` (`not_found`, `forbidden`,
   `conflict`, `invalid`) becomes the HTTP status in `shared/http/domain-error.filter.ts`, which is
   already registered app-wide. Do not write a per-domain filter. **Codes are public API for the
   app: add, never rename.**
6. **Persistence.** `infrastructure/persistence/<thing>.schema.ts`: a `@Schema({ collection,
   timestamps: true })` class whose `enum:` options come from the zod enum. Then
   `mongoose-<thing>.repository.ts` implementing the interface with a private `to<Thing>(doc)`
   mapper, and `in-memory-<thing>.repository.ts` implementing it over an array for unit tests.
7. **Permission.** If the endpoint needs a new action, add it to `actionSchema` and `PERMISSIONS`
   in `packages/shared/src/identity/permissions.ts`, add the row to the matrix in
   `.plans/auth/README.md`, rebuild shared. Then `@Allow('<resource>:<verb>')` on the handler.
   Ownership checks ("is this my order") belong in the use-case, not the matrix.
8. **Controller.** Thin. `@Allow(...)`, `@Body(new ZodValidationPipe(schema))` or `@Query(...)`,
   `@CurrentUser() user` for the caller's id, call one use-case, return its result. Put the
   endpoint table from the README in the class doc comment too. Route literal paths (`mine`)
   before parameter paths (`:id`).
9. **Module.** `MongooseModule.forFeature([...])`, bind each Symbol to its Mongoose class with
   `useClass`, build each use-case with `useFactory` + `inject` so it stays a plain class. Export
   a repository token only when another domain needs it (`catalog` exports `LISTING_REPOSITORY`
   for `orders`; dependencies point one way). Add the module to `app.module.ts`.
10. **Tests.** Unit: `application/services/<domain>.spec.ts`, use-cases over the in-memory
    repositories, no Nest. E2e: `api/test/<domain>.e2e-spec.ts` with supertest against
    `AppModule` and an in-memory MongoDB; register users through `/identity/register` and cover
    every refusal in the endpoint table. Run `npm test -w api` and `npm run test:e2e -w api`.
11. **README.** Recipe 4. Update `.plans/DATA-MODEL.md` if a collection or field changed.

## Recipe 2 — Add a mobile screen that talks to the api

Worked example: `mobile/src/app/orders/index.tsx` (a list), `orders/[id].tsx` (a detail with an
action), `wanted/new.tsx` (a form). Read `CLAUDE.md` "Building UI" first; tokens only.

1. **Api calls in one file.** `features/<domain>/api.ts` exports an object of functions, each one
   `apiFetch(path, { method, body, token, schema })` with the zod schema from
   `@farm-pool/shared`. The response is validated before the screen sees it. No `fetch` anywhere
   else. Example: `features/orders/api.ts`.
2. **Route file.** Under `app/`. Register it in `app/_layout.tsx` inside the signed-in
   `Stack.Protected` group (or the signed-out one). Tabs live in `app/(tabs)/`; anything pushed
   from a tab is a sibling folder (`orders/`, `wanted/`, `listing/`).
3. **Load with `useRequest`.** `const req = useRequest(() => api.thing(token), key)` from
   `lib/use-request.ts`; the key names the inputs. Render with `RequestView` from
   `components/app/request-view.tsx`, which draws loading, error-with-retry and empty states the
   same way everywhere; pass `EmptyNote` as the list's empty component. For a list that must
   reflect a change made on the screen that just closed, add
   `useFocusEffect(useReloadOnRefocus(req.reload))`.
4. **Write with a local `submitting` flag.** Forms parse with the shared zod schema first
   (`schema.safeParse`), show field errors from it, then call the api. A 400 comes back as an
   `ApiError` with `code === "validation_error"` and `fieldMessage(path)`; other codes are the
   stable strings from the domain's `errors.ts`. Switch on `error.code`, never on status or text.
   After a successful create, `router.back()` (the list reloads on focus) or `router.replace`.
5. **Compose from the shared pieces.** `AppBar`, `AppButton`, `AppTextField`,
   `PlaceholderScreen` in `components/app/`; `CropTile`, `ListingGridCard`, `ListingListRow` in
   `features/listings/`; `OrderStatusPill`, `WantedStatusPill` in `features/orders/`;
   `formatPrice`, `formatDate` in `lib/format.ts`. Put a new piece in `features/<domain>/` if only
   that feature uses it, in `components/app/` once a second feature does.
6. **Session.** `const { token, user } = useAuth()` from `providers/auth-provider.tsx`. Show or hide
   an action with `can(user.role, "<action>")` from shared, the same matrix the api enforces.
7. **Check** dark mode and a 48dp tap target on every pressable row, then
   `npx tsc --noEmit -p mobile` and `npm run lint -w mobile`.

## Recipe 3 — Share a type or schema

`packages/shared` is the only place a type both sides read may live. Duplicating it into `api/`
and `mobile/` is how they drift, and neither type checker notices.

- One folder per domain, one file per thing: `src/<domain>/<thing>.ts`. Export from `src/index.ts`.
- Define the zod object; derive the type with `z.infer`. Where a transform changes the shape
  (`phoneSchema` normalises), export both `z.input` (what a form holds) and `z.output` (what the
  api receives).
- Enums are `z.enum([...])`; the Mongoose schema reads `.options` from it so the database cannot
  accept a value the app does not know.
- Request shapes (`createWantedSchema`, `placeOrderSchema`) and response shapes
  (`wantedListingSchema`, `orderSchema`) are separate objects; `extend` one from the other.
- Add something here the moment a second workspace needs it, not before.
- **Rebuild after every edit**: `npm run build -w @farm-pool/shared`. The api compiles against
  `dist/`; Metro reads `src/` and needs nothing.

## Recipe 4 — Document a module

Every domain under `api/src/` carries a `README.md` with the same headings, in this order, so a
reader knows where to look before they open it. Copy `api/src/orders/README.md`.

```
# <Domain> domain
**Owns:** one sentence — the nouns this domain is the source of truth for.
(one paragraph: which story built it, what is deliberately not here yet)

## Lifecycle / Rules worth knowing      (only if the domain has state or non-obvious rules)
## Layout (light DDD)                   table: Folder | Holds | Depends on
## Endpoints                            table: Method | Path | Allow | Result (incl. every error code)
## Flow                                 one request walked through the files, in order
## Reuse points                         what other domains or screens may import from here
## Personas are not domains             the standard closing paragraph, verbatim
```

Write it when the code lands, in the same PR. A `Layout` row names real folders; an `Endpoints`
row lists every refusal the e2e test covers. Mobile features do not carry a README; the screen's
doc comment and this playbook are enough.

Repo-wide reasoning goes in `.plans/`, not in a domain README: a decision another member could
disagree with belongs in `.plans/DECISIONS.md` (recipe 5), a data-model change in
`.plans/DATA-MODEL.md`, a new check in `.plans/VERIFY.md`.

## Recipe 5 — Record a decision

`.plans/DECISIONS.md` has a section "How to record a decision here". Short form: a heading,
"Decided <date> (FARM-n)", what was chosen, what it was chosen over, why, and where in the code it
shows. Open questions get a numbered entry under "Open" with the cheapest ways to close them. Do
not close an open question silently by picking an answer in code.

## Reuse points

Things already built that other stories are expected to call rather than rewrite.

| Need | Use | Where |
| ---- | --- | ----- |
| Refuse a request from a use-case | `DomainError` subclass per domain; app-wide filter maps it | `api/src/shared/kernel/domain-error.ts`, `shared/http/domain-error.filter.ts` |
| Validate a body or query | `ZodValidationPipe(schema)` | `api/src/shared/http/zod-validation.pipe.ts` |
| Protect a route, know the caller | `@Allow(action)`, `@CurrentUser()`, `@Public()` | `api/src/identity/auth/` |
| Read a listing from another domain | `LISTING_REPOSITORY` port, exported by `CatalogModule` | `api/src/catalog/domain/repositories/listing.repository.ts` |
| A dev seed or one-off script | copy `seed-listings.ts` (idempotent, refuses in production) | `api/src/cli/` |
| Call the api from a screen | `apiFetch` + a `features/<domain>/api.ts` object | `mobile/src/lib/api.ts` |
| Loading / error / empty states | `useRequest`, `RequestView`, `EmptyNote`, `useReloadOnRefocus` | `mobile/src/lib/use-request.ts`, `components/app/request-view.tsx` |
| Session and role in a screen | `useAuth()`; `can(role, action)` from shared | `mobile/src/providers/auth-provider.tsx` |
| Buttons, bars, fields, icons | `AppButton`, `AppBar`, `AppTextField`, `icons.tsx` | `mobile/src/components/app/` |
| Crop name and emoji | `cropById(id)`, `CropTile` | `packages/shared/src/catalog/crops.ts`, `mobile/src/features/listings/crop-tile.tsx` |
| Status colours | `OrderStatusPill`, `WantedStatusPill` (semantic tokens per state) | `mobile/src/features/orders/status-pill.tsx` |
| Money and dates | `formatPrice`, `formatDate` | `mobile/src/lib/format.ts` |
