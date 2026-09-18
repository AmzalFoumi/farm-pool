import type { OrderStatus } from '@farm-pool/shared';
import { randomUUID } from 'node:crypto';
import type { NewOrder, Order } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';

/** Map-backed `OrderRepository` for unit tests. */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly rows = new Map<string, Order>();

  create(order: NewOrder): Promise<Order> {
    const now = new Date();
    const row: Order = {
      ...order,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }

  findById(id: string): Promise<Order | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? snapshot(row) : null);
  }

  findByBuyer(buyerId: string): Promise<Order[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((o) => o.buyerId === buyerId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(snapshot),
    );
  }

  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const row = this.rows.get(id);
    if (!row) return Promise.reject(new Error(`No order ${id}`));
    const updated = { ...row, status, updatedAt: new Date() };
    this.rows.set(id, updated);
    return Promise.resolve(snapshot(updated));
  }
}

function snapshot(row: Order): Order {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
