import type { Call, CallChanges, NewCall } from '../entities/call';

export interface CallRepository {
  /** Stores a new call as `requested`. */
  create(call: NewCall): Promise<Call>;
  findById(id: string): Promise<Call | null>;
  update(id: string, changes: CallChanges): Promise<Call>;
  /**
   * Applies `changes` only if the call is still `requested`, in one step, so two answers
   * racing each other cannot both win. `null` when it was already answered.
   */
  updateIfRequested(id: string, changes: CallChanges): Promise<Call | null>;
  /** A `requested` or `active` call from this caller about this listing, if any. */
  findOpen(callerId: string, listingId: string): Promise<Call | null>;
  /** Calls this user made or received, newest first. */
  findByParticipant(userId: string): Promise<Call[]>;
}

export const CALL_REPOSITORY = Symbol('CallRepository');
