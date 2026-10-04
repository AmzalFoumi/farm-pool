import type {
  NewPayment,
  Payment,
  PaymentEntry,
  TakenPayment,
} from '../entities/payment';

export interface PaymentRepository {
  /**
   * Open the escrow record for an order. Resolves `null` when that order already has one: there
   * is one payment per order, and the storage enforces it, so two taps on Pay produce one
   * payment and one refusal rather than a buyer charged twice. Written as `pending`, before the
   * charge, so that winning this insert is what gives a request the right to charge.
   */
  create(payment: NewPayment): Promise<Payment | null>;
  /** The order's payment, including a `pending` claim. Callers that show it check `isTaken`. */
  findByOrder(orderId: string): Promise<Payment | null>;
  /**
   * The charge went through: `pending` → `in_escrow`, with the gateway's name for the charge.
   * Resolves `null` when there is no pending claim on that order any more.
   */
  activate(orderId: string, gatewayRef: string): Promise<TakenPayment | null>;
  /**
   * Release everything still held to the farmer: `in_escrow` → `released`, the held amount to 0,
   * and `entry` appended, as one operation. Matches on the status *and* the amount the caller
   * read, so a release can happen once and only for the sum it was decided on. Resolves `null`
   * when the payment was already released or the held amount has moved since.
   */
  release(orderId: string, entry: PaymentEntry): Promise<TakenPayment | null>;
  /**
   * Move the held balance for a renegotiated price (FARM-53): set the new total and held amount
   * and append `entry`, only while the payment is not yet `released` and still holds
   * `expectedHeld`. A `pending` claim is moved too, so a price accepted while a charge is in
   * flight is not lost. Resolves `null` when it has been released or changed since the caller
   * read it.
   */
  adjust(
    orderId: string,
    expectedHeld: number,
    next: { total: number; heldAmount: number },
    entry: PaymentEntry,
  ): Promise<Payment | null>;
  /** Drop the `pending` claim on an order: its charge failed, or its request died. Never
   *  touches a payment whose money was taken. */
  discardPending(orderId: string): Promise<void>;
  /** Undo a payment whose order turned out not to be payable after all. */
  remove(id: string): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol('PaymentRepository');
