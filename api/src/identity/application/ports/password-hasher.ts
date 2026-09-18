/**
 * "Something that can hash a password and check one." The use-cases depend on this shape only;
 * the scrypt implementation lives in `infrastructure/security/`. Swapping algorithms (say, to
 * argon2 once native builds are acceptable) is a new adapter, not a change to any use-case.
 *
 * `hash` returns a self-describing string (algorithm and parameters included), so `verify` can
 * check an old hash after the parameters change.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
