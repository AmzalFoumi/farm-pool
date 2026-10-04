import type { NewPayment, Payment, PaymentEntry } from '../entities/payment';

export interface PaymentRepository {
  /**
   * Open the escrow record for an order. Resolves `null` when that order already has one: there
   * is one payment per order, and the storage enforces it, so two taps on Pay produce one
   * payment and one refusal rather than a buyer charged twice.
   */
  create(payment: NewPayment): Promise<Payment | null>;
  findByOrder(orderId: string): Promise<Payment | null>;
  /**
   * Release everything still held to the farmer: `in_escrow` → `released`, the held amount to 0,
   * and `entry` appended, as one operation. Matches on the status *and* the amount the caller
   * read, so a release can happen once and only for the sum it was decided on. Resolves `null`
   * when the payment was already released or the held amount has moved since.
   */
  release(orderId: string, entry: PaymentEntry): Promise<Payment | null>;
  /** Undo a payment whose order turned out not to be payable after all. */
  remove(id: string): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol('PaymentRepository');
