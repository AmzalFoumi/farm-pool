# Identity domain

**Owns:** accounts, the four roles (farmer, buyer, coordinator, logistics), permissions, and verification.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/`, `value-objects/`, and `repositories/` (**interfaces only** — "something that can store an identity record"). Pure business rules, no NestJS, no database code. | nothing |
| `application/` | `services/` (use-cases that orchestrate the domain) and `dto/` (request/response shapes). | `domain/` |
| `infrastructure/` | `repositories/` — the real implementations of the interfaces in `domain/repositories/`. | `domain/` |
| `identity.controller.ts` | HTTP handlers. Thin: call an application service, return the result. | `application/` |
| `identity.module.ts` | Binds the interface to its implementation and registers the controller. | all of the above |

## No database yet

Persistence is undecided — see `.plans/DECISIONS.md`, open question 1. Do **not** add an
ORM, a `schemas/` folder, or a database package here. A first repository implementation can
be in-memory; swapping in the real store later is one file in `infrastructure/repositories/`
because `domain/` only ever sees the interface.

## Personas are not domains

farmer, buyer, coordinator and logistics provider are **roles**, modelled in the
`identity` domain. Several of them act in this domain; none of them *is* this domain.
