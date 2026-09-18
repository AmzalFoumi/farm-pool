import type { PublicUser } from '@farm-pool/shared';
import { toPublicUser } from '../../domain/entities/user';
import type { UserRepository } from '../../domain/repositories/user.repository';

/**
 * Every account, for the coordinator's overview. Who may call it is not decided here — the
 * `users:list` action in the shared permission matrix says "coordinator", and the `RolesGuard`
 * enforces that at the endpoint. Keeping the rule out of the use-case means the same class
 * serves a future admin tool with a different gate.
 */
export class ListUsers {
  constructor(private readonly users: UserRepository) {}

  async execute(): Promise<PublicUser[]> {
    const users = await this.users.findAll();
    return users.map(toPublicUser);
  }
}
