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
}
