/**
 * The one error shape a use-case throws when it refuses something.
 *
 * `code` is a stable string the mobile app switches on — public API: add, do not rename.
 * `kind` says what sort of refusal it is, and the HTTP filter in `shared/http` turns the kind into a
 * status. Use-cases therefore never mention HTTP, and an Expo API route would map the same kinds in
 * a `try/catch`. Each domain declares its own codes as a union and its own subclass, so a `catch`
 * can still tell an order error from a catalog error when it wants to.
 *
 * `identity` predates this and keeps its own `IdentityError`; it can move here later without a
 * behaviour change.
 */
export type DomainErrorKind =
  | 'not_found' // 404 — the thing does not exist, or the caller may not know it exists
  | 'forbidden' // 403 — exists, caller is signed in, but it is not theirs to touch
  | 'conflict' // 409 — the request is well-formed but the current state refuses it
  | 'invalid'; // 400 — a rule the zod schema could not express (e.g. quantity vs. a listing)

export class DomainError<Code extends string = string> extends Error {
  constructor(
    public readonly kind: DomainErrorKind,
    public readonly code: Code,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
