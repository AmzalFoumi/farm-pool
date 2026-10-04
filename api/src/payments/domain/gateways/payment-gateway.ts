import type { PaymentMethod } from '@farm-pool/shared';

/**
 * The thing that actually takes money from a buyer. The use-cases know only this interface, so
 * replacing the simulation with a real provider is one new class in `infrastructure/gateway/`
 * and one line in the module — no rule about who may pay, or when, moves.
 */
export interface PaymentGateway {
  readonly method: PaymentMethod;
  /**
   * Take `amount` rupees from the buyer. Resolves with the provider's name for the charge.
   *
   * `idempotencyKey` names the deal being paid for. An implementation must charge once per key:
   * asked again with a key it has seen, it resolves with the charge it already made instead of
   * making another. That is what makes a retry after a crash safe.
   */
  charge(input: {
    orderId: string;
    buyerId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<{ reference: string }>;
  /** Give a charge back: the order turned out not to be payable after the money was taken. */
  refund(input: { reference: string; amount: number }): Promise<void>;
}

export const PAYMENT_GATEWAY = Symbol('PaymentGateway');
