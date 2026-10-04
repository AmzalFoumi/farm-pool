import { randomUUID } from 'node:crypto';
import type {
  NewPayment,
  Payment,
  PaymentEntry,
} from '../../domain/entities/payment';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';

/** Map-backed `PaymentRepository` for unit tests. Keyed by order, like the unique index. */
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly rows = new Map<string, Payment>();

  create(payment: NewPayment): Promise<Payment | null> {
    if (this.rows.has(payment.orderId)) return Promise.resolve(null);
    const now = new Date();
    const row: Payment = {
      ...payment,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.orderId, row);
    return Promise.resolve(snapshot(row));
  }

  findByOrder(orderId: string): Promise<Payment | null> {
    const row = this.rows.get(orderId);
    return Promise.resolve(row ? snapshot(row) : null);
  }

  release(orderId: string, entry: PaymentEntry): Promise<Payment | null> {
    const row = this.rows.get(orderId);
    if (!row || row.status !== 'in_escrow' || row.heldAmount !== entry.amount) {
      return Promise.resolve(null);
    }
    const updated: Payment = {
      ...row,
      status: 'released',
      heldAmount: 0,
      entries: [...row.entries, entry],
      updatedAt: new Date(),
    };
    this.rows.set(orderId, updated);
    return Promise.resolve(snapshot(updated));
  }

  adjust(
    orderId: string,
    expectedHeld: number,
    next: { total: number; heldAmount: number },
    entry: PaymentEntry,
  ): Promise<Payment | null> {
    const row = this.rows.get(orderId);
    if (!row || row.status !== 'in_escrow' || row.heldAmount !== expectedHeld) {
      return Promise.resolve(null);
    }
    const updated: Payment = {
      ...row,
      ...next,
      entries: [...row.entries, entry],
      updatedAt: new Date(),
    };
    this.rows.set(orderId, updated);
    return Promise.resolve(snapshot(updated));
  }

  remove(id: string): Promise<void> {
    for (const [orderId, row] of this.rows) {
      if (row.id === id) this.rows.delete(orderId);
    }
    return Promise.resolve();
  }
}

function snapshot(row: Payment): Payment {
  return { ...row, entries: row.entries.map((entry) => ({ ...entry })) };
}
