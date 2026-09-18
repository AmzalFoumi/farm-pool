import { randomUUID } from 'node:crypto';
import type {
  Cooperative,
  NewCooperative,
} from '../../domain/entities/cooperative';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';

/** Map-backed `CooperativeRepository` for unit tests. Same rules as the Mongoose one. */
export class InMemoryCooperativeRepository implements CooperativeRepository {
  private readonly rows = new Map<string, Cooperative & { seedKey?: string }>();

  findById(id: string): Promise<Cooperative | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? snapshot(row) : null);
  }

  findByCoordinatorId(coordinatorId: string): Promise<Cooperative[]> {
    const found = [...this.rows.values()]
      .filter((c) => c.coordinatorId === coordinatorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(snapshot);
    return Promise.resolve(found);
  }

  upsertBySeedKey(
    seedKey: string,
    cooperative: NewCooperative,
  ): Promise<Cooperative> {
    const existing = [...this.rows.values()].find((c) => c.seedKey === seedKey);
    const row = {
      ...cooperative,
      id: existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? new Date(),
      seedKey,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }

  /** Test helper: add a cooperative directly. */
  seed(
    cooperative: NewCooperative,
    createdAt = new Date(),
  ): Promise<Cooperative> {
    const row = { ...cooperative, id: randomUUID(), createdAt };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }
}

function snapshot(row: Cooperative & { seedKey?: string }): Cooperative {
  return {
    id: row.id,
    coordinatorId: row.coordinatorId,
    name: row.name,
    district: row.district,
    memberFarmerIds: [...row.memberFarmerIds],
    createdAt: new Date(row.createdAt),
  };
}
