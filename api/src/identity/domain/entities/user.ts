import type { AccountStatus, PublicUser, Role } from '@farm-pool/shared';

/**
 * An account, as the domain sees it. One record per person, whatever their role.
 *
 * `passwordHash` is the only secret here and never leaves the api: `toPublicUser` is the single
 * way a user is turned into a response, and it drops the hash. `email` is reserved for the later
 * email credential (`.plans/DECISIONS.md`) and is absent, never `null`, when unset — the unique
 * index on it is sparse and a `null` would count as a value.
 */
export interface User {
  id: string;
  displayName: string;
  /** E.164, e.g. `+94771234567`. Normalised before it gets here; see `phoneSchema` in shared. */
  phone: string;
  email?: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** What is needed to create a user. The store assigns `id`, `status` and the timestamps. */
export type NewUser = Pick<
  User,
  'displayName' | 'phone' | 'passwordHash' | 'role'
> &
  Partial<Pick<User, 'email' | 'status'>>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    displayName: user.displayName,
    phone: user.phone,
    ...(user.email !== undefined ? { email: user.email } : {}),
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
