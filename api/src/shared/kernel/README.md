# Shared kernel

Building blocks every domain reuses. Not a NestJS module: plain types and classes, nothing
injectable, nothing database-specific.

What is here today:

| File | What | Used by |
| ---- | ---- | ------- |
| `domain-error.ts` | `DomainError<Code>` — the one error a use-case throws to refuse something. Carries a `kind` (`not_found`, `forbidden`, `conflict`, `invalid`) and a stable `code` the app switches on. Each domain subclasses it in its own `application/errors.ts` (`CatalogError`, `OrderError`). | `catalog`, `orders`; every new domain |

The HTTP side of it, `DomainErrorFilter` in `src/shared/http/`, maps the `kind` to a status and
is registered once in `app.module.ts`. So a use-case never mentions HTTP, and a new domain gets
error handling for free by throwing the right subclass. `identity` predates this and keeps its own
`IdentityError` and filter; it can move over without a behaviour change.

`entities/` and `repositories/` are empty placeholders for a base entity or repository helper, if
two domains ever need the same one. Add something here only when a second domain needs the exact
same thing; a helper with one caller belongs in that domain. The same rule `packages/shared`
follows.

Recipe for using it: `.plans/PLAYBOOK.md`, recipe 1, step 5.
