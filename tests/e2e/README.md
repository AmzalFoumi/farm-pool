# End-to-end tests

Black-box tests that drive the **running api over HTTP**, the way the app does. They complement
the unit tests in `api/src/**/*.spec.ts` (which run against in-memory repositories and never open
a socket) by checking that a whole flow survives the controller, the guards, the validation pipe
and Mongo together.

## Running them

```bash
# 1. Start the api (any port; 3000 is often taken by another project)
PORT=3100 npm run start:dev -w api

# 2. Point the tests at it and run
E2E_API_URL=http://localhost:3100 node --test tests/e2e
```

`E2E_API_URL` defaults to `http://localhost:3000`. No test framework to install — these use Node's
built-in runner, so there is nothing to keep in step with the api's jest version.

## What they assume

**A real database.** They create accounts with throwaway phone numbers under `+9477000099xx` and
leave them behind; that is deliberate, because a test that cleans up cannot tell you whether the
data it wrote was readable on the next request.

**Two transitions have no endpoint yet** and are nudged directly in Mongo:

| Transition | Why there is no endpoint | Remove when |
| ---------- | ------------------------ | ----------- |
| listing `pending_approval` → `verified` | Coordinator approval is unbuilt (FARM-43) | FARM-43 lands |
| order `requested` → `open` | Farmer acceptance is unbuilt (FARM-46) | FARM-46 lands |

Both are marked `NUDGE:` in the source. They are the two places these tests lie about the system,
so they are the first thing to delete when the real endpoints exist.
