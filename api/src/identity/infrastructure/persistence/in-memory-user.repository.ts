import { randomUUID } from 'node:crypto';
import type { NewUser, User } from '../../domain/entities/user';
import {
  DuplicatePhoneError,
  type UserRepository,
} from '../../domain/repositories/user.repository';

/**
 * A `UserRepository` backed by a Map. For unit tests of the use-cases, and the fallback if the
 * api ever has to run without a database. Mirrors the Mongo rules that matter: unique phone,
 * unique email when present, `status` defaults to `active`, and every method hands out a copy
 * (`snapshot`) rather than the stored object, as a database driver would, so a caller editing
 * the result cannot change what the next read sees.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.snapshotOrNull(this.users.get(id)));
  }

  findByPhone(phone: string): Promise<User | null> {
    return Promise.resolve(
      this.snapshotOrNull(this.all().find((u) => u.phone === phone)),
    );
  }

  findByEmail(email: string): Promise<User | null> {
    const wanted = email.toLowerCase();
    return Promise.resolve(
      this.snapshotOrNull(this.all().find((u) => u.email === wanted)),
    );
  }

  create(user: NewUser): Promise<User> {
    const email = user.email?.toLowerCase();
    const taken = this.all().some(
      (u) =>
        u.phone === user.phone || (email !== undefined && u.email === email),
    );
    if (taken) return Promise.reject(new DuplicatePhoneError(user.phone));

    const now = new Date();
    const created: User = {
      id: randomUUID(),
      displayName: user.displayName,
      phone: user.phone,
      ...(email !== undefined ? { email } : {}),
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(created.id, created);
    return Promise.resolve(snapshot(created));
  }

  findAll(): Promise<User[]> {
    return Promise.resolve(this.all().map(snapshot));
  }

  private all(): User[] {
    return [...this.users.values()];
  }

  private snapshotOrNull(user: User | undefined): User | null {
    return user ? snapshot(user) : null;
  }
}

/** A detached copy. `Date` is mutable, so the two dates are cloned, not shared. */
function snapshot(user: User): User {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}
