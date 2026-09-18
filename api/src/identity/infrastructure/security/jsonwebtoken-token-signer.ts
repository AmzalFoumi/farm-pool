import { jwtPayloadSchema, type JwtPayload } from '@farm-pool/shared';
import jwt from 'jsonwebtoken';
import { IdentityError } from '../../application/errors';
import type {
  TokenClaims,
  TokenSigner,
} from '../../application/ports/token-signer';

export interface JsonwebtokenTokenSignerOptions {
  /** At least 32 characters; `envSchema` enforces that. */
  secret: string;
  /** `jsonwebtoken` duration, e.g. `30d`, `12h`, or a number of seconds. */
  expiresIn: string;
}

/**
 * HS256 access tokens via `jsonwebtoken`.
 *
 * WHY NOT `jose`: `jose` v6 is ESM-only, and this api is CommonJS with a CommonJS Jest. It
 * would need transform rules in both Jest configs just to load. `jsonwebtoken` is CommonJS,
 * dependency-light and does exactly the two things needed. When the api moves to ESM
 * (`.plans/DECISIONS.md`, open), this is the one file to swap — nothing else names the library.
 *
 * WHY NOT `@nestjs/jwt`: it would put a Nest import behind the `TokenSigner` port, and the
 * whole point of the port is that the use-cases and their adapters run without Nest.
 *
 * Verification pins the algorithm to HS256 so a token that claims `alg: none` is rejected, and
 * then checks the claims against `jwtPayloadSchema`, so the guard only ever sees the four
 * fields the app agreed on.
 */
export class JsonwebtokenTokenSigner implements TokenSigner {
  constructor(private readonly options: JsonwebtokenTokenSignerOptions) {}

  sign(claims: TokenClaims): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        { role: claims.role },
        this.options.secret,
        {
          algorithm: 'HS256',
          subject: claims.sub,
          expiresIn: this.options.expiresIn as jwt.SignOptions['expiresIn'],
        },
        (error, token) => {
          if (error || !token) reject(error ?? new Error('sign failed'));
          else resolve(token);
        },
      );
    });
  }

  verify(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.options.secret,
        { algorithms: ['HS256'] },
        (error, decoded) => {
          if (error) {
            reject(new IdentityError('invalid_token', error.message));
            return;
          }
          const parsed = jwtPayloadSchema.safeParse(decoded);
          if (!parsed.success) {
            reject(
              new IdentityError(
                'invalid_token',
                'Token claims do not match the expected shape',
              ),
            );
            return;
          }
          resolve(parsed.data);
        },
      );
    });
  }
}
