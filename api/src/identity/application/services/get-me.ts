import type { PublicUser } from '@farm-pool/shared';
import { toPublicUser } from '../../domain/entities/user';
import type { UserRepository } from '../../domain/repositories/user.repository';
import { IdentityError } from '../errors';

/**
 * The signed-in user's own record, fresh from the store — not from the token. The token says
 * who they were at login; this says who they are now (role, status, name). The app calls it
 * on every cold start to decide whether the saved session is still good.
 */
export class GetMe {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      // A valid token for a deleted account: treat as signed out.
      throw new IdentityError('not_found', 'This account no longer exists');
    }
    return toPublicUser(user);
  }
}
