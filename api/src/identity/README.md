# Identity domain

**Owns:** accounts, the four roles (farmer, buyer, coordinator, logistics), permissions, and verification.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/` (`User`, `toPublicUser`), `value-objects/`, and `repositories/` (**interfaces only** — `UserRepository`, "something that can store an account"). Pure business rules, no NestJS, no database code. ESLint rejects a `@nestjs/*` or `mongoose` import here. | `packages/shared` |
| `application/` | `services/` (use-cases that orchestrate the domain) and `dto/` (request/response shapes). Same framework-free rule as `domain/`. | `domain/` |
| `infrastructure/` | `persistence/` — the Mongoose schema for the `users` collection, `MongooseUserRepository` (the real store) and `InMemoryUserRepository` (tests). | `domain/` |
| `identity.controller.ts` | HTTP handlers. Thin: call an application service, return the result. | `application/` |
| `identity.module.ts` | Registers the `users` model, binds `USER_REPOSITORY` to the Mongoose implementation, registers the controller. | all of the above |

## Persistence

MongoDB via Mongoose (`.plans/DECISIONS.md`). The connection is opened once in
`src/database/database.module.ts` from `DATABASE_URI`; this domain only registers its own
collection with `MongooseModule.forFeature`. Two rules the schema depends on:

- **`phone` is the login identifier** and is stored normalised (`+94XXXXXXXXX`, from
  `phoneSchema` in `packages/shared`). Unique.
- **`email` is reserved** for the later email credential. Its unique index is *sparse*, which
  only works while unset emails are left out of the document entirely — never write `null`.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
