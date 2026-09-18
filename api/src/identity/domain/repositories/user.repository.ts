import type { NewUser, User } from '../entities/user';

/**
 * "Something that can store users." The domain and the use-cases only ever see this interface;
 * the Mongoose implementation lives in `infrastructure/persistence/` and an in-memory one backs
 * the unit tests. Swapping stores is a binding change in `identity.module.ts`.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Rejects with `DuplicatePhoneError` when the phone (or email) is already registered. */
  create(user: NewUser): Promise<User>;
  findAll(): Promise<User[]>;
}

/**
 * Injection token. Nest cannot inject by TypeScript interface (interfaces do not exist at
 * runtime), so the binding is by this symbol: `@Inject(USER_REPOSITORY)`.
 */
export const USER_REPOSITORY = Symbol('UserRepository');

export class DuplicatePhoneError extends Error {
  constructor(public readonly phone: string) {
    super(`A user with phone ${phone} already exists`);
    this.name = 'DuplicatePhoneError';
  }
}
