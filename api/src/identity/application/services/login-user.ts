import {
  normalizeSriLankanPhone,
  type AuthResponse,
  type LoginInput,
} from '@farm-pool/shared';
import { toPublicUser } from '../../domain/entities/user';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { IdentityError } from '../errors';
import type { PasswordHasher } from '../ports/password-hasher';
import type { TokenSigner } from '../ports/token-signer';

/**
 * Check a phone + password and issue a token.
 *
 * `identifier` is whatever the person typed. Today it must normalise as a Sri Lankan phone
 * number; when the email credential is switched on, the branch is: "if it does not look like
 * a phone, look it up as an email" — no request-shape change.
 *
 * Every failure is the same `invalid_credentials`, and a missing account still costs one hash
 * check (`dummyHash`), so an attacker cannot tell "no such phone" from "wrong password" by the
 * response or by the time it took.
 */
export class LoginUser {
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenSigner,
  ) {}

  async execute(input: LoginInput): Promise<AuthResponse> {
    const phone = normalizeSriLankanPhone(input.identifier);
    const user = phone ? await this.users.findByPhone(phone) : null;

    const ok = await this.hasher.verify(
      input.password,
      user ? user.passwordHash : await this.getDummyHash(),
    );
    if (!user || !ok) {
      throw new IdentityError(
        'invalid_credentials',
        'Phone number or password is incorrect',
      );
    }

    const token = await this.tokens.sign({ sub: user.id, role: user.role });
    return { token, user: toPublicUser(user) };
  }

  /** Hashed once per process, lazily, so a failed login for an unknown phone takes as long as
   *  one for a known phone. */
  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('not-a-real-password');
    return this.dummyHash;
  }
}
