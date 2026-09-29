import { randomUUID } from 'node:crypto';
import type { Call, CallChanges, NewCall } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';

/** Map-backed `CallRepository` for unit tests. */
export class InMemoryCallRepository implements CallRepository {
  private readonly rows = new Map<string, Call>();

  create(call: NewCall): Promise<Call> {
    const now = new Date();
    const row: Call = {
      ...call,
      id: randomUUID(),
      status: 'requested',
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return Promise.resolve({ ...row });
  }

  findById(id: string): Promise<Call | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? { ...row } : null);
  }

  update(id: string, changes: CallChanges): Promise<Call> {
    const row = this.rows.get(id);
    if (!row) return Promise.reject(new Error(`No call ${id}`));
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return Promise.resolve({ ...updated });
  }

  updateIfRequested(id: string, changes: CallChanges): Promise<Call | null> {
    const row = this.rows.get(id);
    if (!row || row.status !== 'requested') return Promise.resolve(null);
    const updated = { ...row, ...changes, updatedAt: new Date() };
    this.rows.set(id, updated);
    return Promise.resolve({ ...updated });
  }

  findOpen(callerId: string, listingId: string): Promise<Call | null> {
    const row = [...this.rows.values()].find(
      (c) =>
        c.callerId === callerId &&
        c.listingId === listingId &&
        (c.status === 'requested' || c.status === 'active'),
    );
    return Promise.resolve(row ? { ...row } : null);
  }

  findByParticipant(userId: string): Promise<Call[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((c) => c.callerId === userId || c.calleeId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((c) => ({ ...c })),
    );
  }
}
