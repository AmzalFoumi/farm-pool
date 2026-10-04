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

  charge(): Promise<{ reference: string }> {
    return Promise.resolve({ reference: `sim_${randomUUID()}` });
  }
}
