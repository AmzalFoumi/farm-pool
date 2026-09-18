/**
 * Everything the identity use-cases can refuse, as one error type with a stable `code`.
 *
 * The use-cases know nothing about HTTP. `identity-error.filter.ts` (a Nest adapter) maps each
 * code to a status; an Expo API route would do the same in a `try/catch`. The codes are what the
 * mobile app switches on, so treat them as public API: add, do not rename.
 */
export type IdentityErrorCode =
  'phone_taken' | 'invalid_credentials' | 'invalid_token' | 'not_found';

export class IdentityError extends Error {
  constructor(
    public readonly code: IdentityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityError';
  }
}
