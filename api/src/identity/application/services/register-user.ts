import type { AuthResponse, RegisterData } from '@farm-pool/shared';
import { toPublicUser, type User } from '../../domain/entities/user';
import {
  DuplicatePhoneError,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import { IdentityError } from '../errors';
import type { PasswordHasher } from '../ports/password-hasher';
import type { TokenSigner } from '../ports/token-signer';

/**
 * Create an account and sign the new user in, in one step.
 *
 * Plain class, constructor-injected: NestJS builds it in `identity.module.ts` with `useFactory`,
 * and an Expo API route would build it with `new`. The input is already validated and the phone
 * already normalised — `registerSchema` ran at the edge (`ZodValidationPipe`), so this file
 * holds only the rule that is not a shape rule: one account per phone number.
 *
 * A farmer starts `pending_review`, not `active` (FARM-44) — every other role is unaffected.
 * They still get a token back: `RolesGuard` is what keeps a pending account from doing anything
 * beyond `cooperative:join` (see `AllowWhilePending`), not registration itself. Which cooperative
 * they join is a separate step the app calls right after this one (`POST /coordination/apply`) —
 * kept out of here so `identity` never has to depend on `coordination`.
 */
export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenSigner,
  ) {}

  async execute(data: RegisterData): Promise<AuthResponse> {
    const passwordHash = await this.hasher.hash(data.password);

    let user: User;
    try {
      user = await this.users.create({
        displayName: data.displayName,
        phone: data.phone,
        passwordHash,
        role: data.role,
        ...(data.role === 'farmer'
          ? { status: 'pending_review' as const }
          : {}),
      });
    } catch (error) {
      if (error instanceof DuplicatePhoneError) {
        throw new IdentityError(
          'phone_taken',
          'An account with this phone number already exists',
        );
      }
      throw error;
    }

    const token = await this.tokens.sign({
      sub: user.id,
      role: user.role,
      status: user.status,
    });
    return { token, user: toPublicUser(user) };
  }
}
