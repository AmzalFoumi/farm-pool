import type { JwtPayload, Role } from '@farm-pool/shared';

/** The claims a use-case supplies; the signer adds `iat` and `exp`. */
export interface TokenClaims {
  sub: string;
  role: Role;
}

/**
 * "Something that can issue an access token and check one." Login and register ask it to
 * `sign`; the auth guard asks it to `verify`. The implementation (HS256 via `jsonwebtoken`,
 * in `infrastructure/security/`) is the only place the library name appears.
 *
 * `verify` rejects with `IdentityError('invalid_token')` for a bad signature, an expired token,
 * or claims that do not match `jwtPayloadSchema` — the guard turns any of those into a 401.
 */
export interface TokenSigner {
  sign(claims: TokenClaims): Promise<string>;
  verify(token: string): Promise<JwtPayload>;
}

export const TOKEN_SIGNER = Symbol('TokenSigner');
