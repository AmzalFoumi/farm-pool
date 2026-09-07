# Shared kernel

Base building blocks reused across every domain — a base `Entity` class, a `Result` type,
common value-object helpers. Not a NestJS module: these are types and helpers, not
injectable providers.

Add something here only once a second domain needs the exact same thing. A shared helper
with one caller is indirection for its own sake — the same rule `packages/shared` follows.

Nothing database-specific belongs here.
