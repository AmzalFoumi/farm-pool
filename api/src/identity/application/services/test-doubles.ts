import type { JwtPayload } from '@farm-pool/shared';
import { IdentityError } from '../errors';
import type { PasswordHasher } from '../ports/password-hasher';
import type { TokenClaims, TokenSigner } from '../ports/token-signer';

/**
 * Fast, transparent stand-ins for the use-case unit tests. The real scrypt hasher is
 * deliberately slow and the real signer needs a secret; here a "hash" is `hashed:<plain>` and
 * a "token" is `token:<sub>:<role>`, so a test can read them.
 */
export class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

export class FakeTokenSigner implements TokenSigner {
  sign(claims: TokenClaims): Promise<string> {
    return Promise.resolve(`token:${claims.sub}:${claims.role}`);
  }

  verify(token: string): Promise<JwtPayload> {
    const [prefix, sub, role] = token.split(':');
    if (prefix !== 'token' || !sub || !role) {
      return Promise.reject(new IdentityError('invalid_token', 'bad token'));
    }
    const iat = Math.floor(Date.now() / 1000);
    return Promise.resolve({
      sub,
      role: role as JwtPayload['role'],
      iat,
      exp: iat + 3600,
    });
  }
}
