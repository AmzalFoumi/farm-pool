import type { NewPayment, Payment } from '../entities/payment';

export interface PaymentRepository {
  /**
   * Open the escrow record for an order. Resolves `null` when that order already has one: there
   * is one payment per order, and the storage enforces it, so two taps on Pay produce one
   * payment and one refusal rather than a buyer charged twice.
   */
  create(payment: NewPayment): Promise<Payment | null>;
  findByOrder(orderId: string): Promise<Payment | null>;
  /** Undo a payment whose order turned out not to be payable after all. */
  remove(id: string): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol('PaymentRepository');
