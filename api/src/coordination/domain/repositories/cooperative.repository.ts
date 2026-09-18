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
  upsertBySeedKey(
    seedKey: string,
    cooperative: NewCooperative,
  ): Promise<Cooperative>;
}

export const COOPERATIVE_REPOSITORY = Symbol('CooperativeRepository');
