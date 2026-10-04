import { randomUUID } from 'node:crypto';
import type { PaymentGateway } from '../../domain/gateways/payment-gateway';

/**
 * NO REAL MONEY MOVES. Every charge is approved and given a made-up reference.
 *
 * No payment provider has been chosen (`.plans/DECISIONS.md`, "Payments"), and holding other
 * people's money needs a merchant account nobody on a coursework team has. This class is the
 * whole of the pretence: everything around it — who may pay, the split, the release — is real.
 */
export class SimulatedPaymentGateway implements PaymentGateway {
  readonly method = 'simulated' as const;

  /** One made-up reference per key, so asking twice for the same deal is one charge. */
  private readonly charges = new Map<string, string>();

  charge(input: { idempotencyKey: string }): Promise<{ reference: string }> {
    const reference =
      this.charges.get(input.idempotencyKey) ?? `sim_${randomUUID()}`;
    this.charges.set(input.idempotencyKey, reference);
    return Promise.resolve({ reference });
  }

  refund(input: { reference: string }): Promise<void> {
    for (const [key, reference] of this.charges) {
      if (reference === input.reference) this.charges.delete(key);
    }
    return Promise.resolve();
  }
}
