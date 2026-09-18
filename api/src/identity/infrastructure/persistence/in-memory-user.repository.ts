import { randomUUID } from 'node:crypto';
import type { NewUser, User } from '../../domain/entities/user';
import {
  DuplicatePhoneError,
  type UserRepository,
} from '../../domain/repositories/user.repository';

/**
 * A `UserRepository` backed by a Map. For unit tests of the use-cases, and the fallback if the
 * api ever has to run without a database. Mirrors the Mongo rules that matter: unique phone,
 * unique email when present, `status` defaults to `active`.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByPhone(phone: string): Promise<User | null> {
    return Promise.resolve(this.all().find((u) => u.phone === phone) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    const wanted = email.toLowerCase();
    return Promise.resolve(this.all().find((u) => u.email === wanted) ?? null);
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
    return Promise.resolve(created);
  }

  findAll(): Promise<User[]> {
    return Promise.resolve(this.all());
  }

  private all(): User[] {
    return [...this.users.values()];
  }
}
