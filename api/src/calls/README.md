# Calls domain

**Owns:** who may join which video call. A call is between two users about one listing.

**Does not own the video.** Both phones stream audio and video through Agora's network; nothing
passes through this api or is stored. This domain only records the call and signs the short-lived
Agora token (a pass into one channel) that lets a participant in. The App Certificate that signs
passes lives in `api/.env` and never reaches the app.

Built in FARM-40 (join and end). FARM-24 adds requesting, listing, accepting and declining.

## Lifecycle

```
requested ──callee──▶ active ──either──▶ ended
    └──────callee──▶ declined
```

Request-then-accept. Scheduling a time is deliberately not built yet.

## Layout (light DDD)

| Folder | Holds | Depends on |
| ------ | ----- | ---------- |
| `domain/` | `entities/call.ts` (`Call`, `channelFor`, `isParticipant`, `toCallDto`), `repositories/call.repository.ts`, `services/call-token-signer.ts` (the signing port). | `packages/shared` |
| `application/` | `services/` — `IssueCallToken`, `EndCall`, `loadOwnCall`; `errors.ts` — `CallError`. | `domain/` |
| `infrastructure/persistence/` | Mongoose schema for `calls`, the Mongoose repository, an in-memory one for tests. | `domain/` |
| `infrastructure/agora/` | `AgoraTokenSigner`, the only file that imports `agora-token`. | `config/env.ts` |

## Endpoints

| Method | Path | Allow | Result |
| ------ | ---- | ----- | ------ |
| POST | `/calls/:id/token` | `call:join` | 200 `CallToken`; 403 `not_your_call`; 404 `call_not_found`; 409 `call_not_active` or `calls_not_configured` |
| POST | `/calls/:id/end` | `call:join` | 200 `Call` in `ended` (repeat is a no-op); 403; 404; 409 `call_not_active` |

`call:join` is open to every role; the use-case then checks the caller is one of the two people,
as `order:read-own` does. The channel (`call_<id>`) and the Agora account (the user id) are set by
the server, so a client cannot join a room that is not theirs. Passes last one hour; the first
one issued stamps `startedAt`.

## Flow

`POST /calls/:id/token`, in the order the files run.

| Step | File | What happens |
| ---- | ---- | ------------ |
| 1 | `identity/auth/jwt-auth.guard.ts`, `roles.guard.ts` | Token verified; `@Allow('call:join')` checked. |
| 2 | `calls.controller.ts` | `@CurrentUser()` supplies the user id. |
| 3 | `application/services/issue-call-token.ts` | `loadOwnCall` refuses a missing call or a stranger; a call that is not `active` is refused; the signer is asked for a pass. |
| 4 | `infrastructure/agora/agora-token-signer.ts` | `RtcTokenBuilder.buildTokenWithUserAccount` as `PUBLISHER`, or `null` without keys (`calls_not_configured`). |
| 5 | back in the app | `apiFetch` validates with `callTokenSchema`; the call screen joins the channel with it. |

## Reuse points

- **`CALL_REPOSITORY`** — FARM-24 adds its list, request and answer methods here.
- **`CALL_TOKEN_SIGNER`** — swap the provider by writing a new signer; use-cases do not change.
- Unit tests: `application/services/calls.spec.ts` over `InMemoryCallRepository` and a fake signer.
