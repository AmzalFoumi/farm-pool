import type { Cooperative, NewCooperative } from '../entities/cooperative';

/**
 * "Something that can store cooperatives." Use-cases see only this; the Mongoose implementation
 * is in `infrastructure/persistence/` and an in-memory one backs the unit tests.
 *
 * `upsertBySeedKey` exists for a dev seed, same reason as `catalog`'s: a re-run updates rather
 * than duplicates. A coordinator-driven create endpoint is not decided yet
 * (`.plans/coordination/OPEN.md`).
 */
export interface CooperativeRepository {
  findById(id: string): Promise<Cooperative | null>;
  /** Every cooperative this coordinator runs. Usually one, but nothing here assumes that. */
  findByCoordinatorId(coordinatorId: string): Promise<Cooperative[]>;
  /** The cooperative covering this district, case-insensitively. Null when none exists yet
   *  (FARM-44) — cooperative creation is its own open question, not this method's job. */
  findByDistrict(district: string): Promise<Cooperative | null>;
  upsertBySeedKey(
    seedKey: string,
    cooperative: NewCooperative,
  ): Promise<Cooperative>;
  /** Adds one farmer id to `memberFarmerIds`, idempotently — a farmer applying twice (FARM-44)
   *  is a no-op, not a duplicate. Null if the cooperative no longer exists. */
  addMember(
    cooperativeId: string,
    farmerId: string,
  ): Promise<Cooperative | null>;
  /** Removes one farmer id from `memberFarmerIds` (FARM-44, a rejected applicant). Null if the
   *  cooperative no longer exists. */
  removeMember(
    cooperativeId: string,
    farmerId: string,
  ): Promise<Cooperative | null>;
}

export const COOPERATIVE_REPOSITORY = Symbol('CooperativeRepository');
