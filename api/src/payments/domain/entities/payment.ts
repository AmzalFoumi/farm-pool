import type {
  Payment as PaymentDto,
  PaymentEntryKind,
  PaymentMethod,
  PaymentStatus,
} from '@farm-pool/shared';
import { randomBytes } from 'node:crypto';

/** One movement of money on a payment. See `packages/shared/src/payments/payment.ts`. */
export interface PaymentEntry {
  kind: PaymentEntryKind;
  amount: number;
  receiptNo: string;
  at: Date;
}

/**
 * The escrow record for one order. `total`, `advanceAmount` and `heldAmount` are the current
 * position; `entries` is how it got there, oldest first, and is only ever appended to.
 */
export interface Payment {
  id: string;
  orderId: string;
  buyerId: string;
  farmerId: string;
  total: number;
  advanceAmount: number;
  heldAmount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  /** What the gateway called the charge. Kept for reconciling against a real provider later;
   *  never sent to the app. */
  gatewayRef: string;
  entries: PaymentEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export type NewPayment = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * `FP-261004-7K2QXD`: the date, then six characters from an alphabet with no 0/O or 1/I, because
 * a receipt number is read aloud over a bad phone line when something has gone wrong.
 */
export function newReceiptNo(at: Date): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const day = at.toISOString().slice(2, 10).replaceAll('-', '');
  const tail = [...randomBytes(6)]
    .map((byte) => alphabet[byte % alphabet.length])
    .join('');
  return `FP-${day}-${tail}`;
}

export function newEntry(
  kind: PaymentEntryKind,
  amount: number,
  at: Date,
): PaymentEntry {
  return { kind, amount, receiptNo: newReceiptNo(at), at };
}

export function toPaymentDto(payment: Payment): PaymentDto {
  return {
    id: payment.id,
    orderId: payment.orderId,
    buyerId: payment.buyerId,
    farmerId: payment.farmerId,
    total: payment.total,
    advanceAmount: payment.advanceAmount,
    heldAmount: payment.heldAmount,
    status: payment.status,
    method: payment.method,
    entries: payment.entries.map((entry) => ({
      kind: entry.kind,
      amount: entry.amount,
      receiptNo: entry.receiptNo,
      at: entry.at.toISOString(),
    })),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
