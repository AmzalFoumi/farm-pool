# Identity domain

**Owns:** accounts, the four roles (farmer, buyer, coordinator, logistics), permissions, and verification.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/` (`User`, `toPublicUser`), `value-objects/`, and `repositories/` (**interfaces only** — `UserRepository`, "something that can store an account"). Pure business rules, no NestJS, no database code. ESLint rejects a `@nestjs/*` or `mongoose` import here. | `packages/shared` |
| `application/` | `services/` — the use-cases (`RegisterUser`, `LoginUser`, `GetMe`, `ListUsers`), plain constructor-injected classes; `ports/` — the interfaces they need (`PasswordHasher`, `TokenSigner`); `errors.ts` — `IdentityError` with stable codes. Same framework-free rule as `domain/`. Request/response shapes are the zod schemas in `packages/shared`, not DTO classes. | `domain/` |
| `infrastructure/` | `persistence/` — the Mongoose schema for the `users` collection, `MongooseUserRepository` (the real store) and `InMemoryUserRepository` (tests). `security/` — `ScryptPasswordHasher` (`node:crypto`) and `JsonwebtokenTokenSigner` (HS256). | `application/ports`, `domain/` |
| `auth/` | The NestJS adapters: `JwtAuthGuard` (global; `@Public()` opts out), `RolesGuard` (`@Allow(action)` / `@Roles()`), `@CurrentUser()`. Other domains import the decorators from here. | `application/ports` |
| `identity.controller.ts` | HTTP handlers. Thin: validate with `ZodValidationPipe(schema)`, call a use-case, return the result. | `application/` |
| `identity-error.filter.ts` | Maps `IdentityError` codes to HTTP statuses (409 / 401 / 404). | `application/` |
| `identity.module.ts` | Binds the three ports to their adapters, builds the use-cases with `useFactory`, registers the guards as `APP_GUARD` and the filter as `APP_FILTER`. | all of the above |

## Endpoints

| Method | Path | Who | Result |
| ------ | ---- | --- | ------ |
| POST | `/identity/register` | anyone; all four roles self-register | 201 `AuthResponse`, 400 `validation_error`, 409 `phone_taken` |
| POST | `/identity/login` | anyone | 200 `AuthResponse`, 401 `invalid_credentials` |
| GET | `/identity/me` | any signed-in role | 200 `PublicUser`, 401 `unauthorized` |
| GET | `/identity/users` | `users:list` in the shared matrix (coordinator) | 200 `PublicUser[]`, 403 `forbidden` |

Every refusal has the body `{ code, message }` (`apiErrorSchema` in shared); `validation_error`
adds `issues: [{ path, message }]`. Full walk-through, token shape and the trade-offs:
`.plans/auth/README.md`.

## Protecting a route in another domain

```ts
import { Allow } from '../identity/auth/roles.decorator';
import { CurrentUser } from '../identity/auth/current-user.decorator';

@Allow('listing:create')
@Post()
create(@CurrentUser() user: AuthenticatedUser, ...) { /* user.sub, user.role */ }
```

No decorator at all means "any signed-in user". `@Public()` means "no token needed" — use it
only for health checks and the two auth endpoints.

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
