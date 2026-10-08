import type { SavedLocation } from '@farm-pool/shared';
import type { DriverProfile, NewUser, User } from '../entities/user';

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
  /** Replaces the user's `driver` object. Resolves `null` when no such user exists. */
  saveDriverProfile(id: string, driver: DriverProfile): Promise<User | null>;
  /** Replace the whole saved-location list. The use-case owns the add/remove rules and the cap,
   *  so the store only ever writes the list it is given. Resolves `null` when no such user. */
  saveLocations(id: string, locations: SavedLocation[]): Promise<User | null>;
  /** Sets the district a farmer named applying to a cooperative (FARM-44). Resolves `null` when
   *  no such user exists. */
  saveFarmerDistrict(id: string, district: string): Promise<User | null>;
  /** `pending_review` → `active` (FARM-44, a coordinator approving a farmer). Filtered on the
   *  current status, same as `OrderRepository.assignDriver`: resolves `null` if the account is
   *  not currently `pending_review` (already active, suspended, or gone), never partially. */
  activate(id: string): Promise<User | null>;
  /** `pending_review` → `suspended`, recording why (FARM-44, a coordinator rejecting a farmer).
   *  Same filtered shape as `activate`. */
  reject(id: string, reason: string): Promise<User | null>;
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
