import type { PaymentMethod } from '@farm-pool/shared';

/**
 * The thing that actually takes money from a buyer. The use-cases know only this interface, so
 * replacing the simulation with a real provider is one new class in `infrastructure/gateway/`
 * and one line in the module — no rule about who may pay, or when, moves.
 */
export interface PaymentGateway {
  readonly method: PaymentMethod;
  /** Take `amount` rupees from the buyer. Resolves with the provider's name for the charge. */
  charge(input: {
    orderId: string;
    buyerId: string;
    amount: number;
  }): Promise<{ reference: string }>;
}

export const PAYMENT_GATEWAY = Symbol('PaymentGateway');
