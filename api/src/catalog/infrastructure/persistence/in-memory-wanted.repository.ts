import type { WantedStatus } from '@farm-pool/shared';
import { randomUUID } from 'node:crypto';
import type {
  NewWantedListing,
  WantedListing,
} from '../../domain/entities/wanted-listing';
import type { WantedRepository } from '../../domain/repositories/wanted.repository';

/** Map-backed `WantedRepository` for unit tests. */
export class InMemoryWantedRepository implements WantedRepository {
  private readonly rows = new Map<string, WantedListing>();

  create(input: NewWantedListing): Promise<WantedListing> {
    const now = new Date();
    const row: WantedListing = {
      ...input,
      id: randomUUID(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }

  findById(id: string): Promise<WantedListing | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? snapshot(row) : null);
  }

  findByBuyer(buyerId: string): Promise<WantedListing[]> {
    return Promise.resolve(
      this.newestFirst()
        .filter((w) => w.buyerId === buyerId)
        .map(snapshot),
    );
  }

  findByStatus(status: WantedStatus, limit: number): Promise<WantedListing[]> {
    return Promise.resolve(
      this.newestFirst()
        .filter((w) => w.status === status)
        .slice(0, limit)
        .map(snapshot),
    );
  }

  updateStatus(id: string, status: WantedStatus): Promise<WantedListing> {
    const row = this.rows.get(id);
    if (!row) return Promise.reject(new Error(`No wanted listing ${id}`));
    const updated = { ...row, status, updatedAt: new Date() };
    this.rows.set(id, updated);
    return Promise.resolve(snapshot(updated));
  }

  private newestFirst(): WantedListing[] {
    return [...this.rows.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}

function snapshot(row: WantedListing): WantedListing {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
