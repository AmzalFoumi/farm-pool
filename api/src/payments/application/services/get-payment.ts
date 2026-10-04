import type { Payment } from '@farm-pool/shared';
import { isTaken, toPaymentDto } from '../../domain/entities/payment';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentError } from '../errors';

/** The payment on one order, visible to its buyer and its farmer only. */
export class GetPayment {
  constructor(private readonly payments: PaymentRepository) {}

  async execute(callerId: string, orderId: string): Promise<Payment> {
    const payment = await this.payments.findByOrder(orderId);
    // A `pending` claim is a charge still in flight: to the app, no payment yet.
    if (!payment || !isTaken(payment)) {
      throw new PaymentError(
        'not_found',
        'payment_not_found',
        'This order has not been paid for yet',
      );
    }
    if (payment.buyerId !== callerId && payment.farmerId !== callerId) {
      throw new PaymentError(
        'forbidden',
        'not_your_order',
        'Only the buyer and the farmer on an order can see its payment',
      );
    }
    return toPaymentDto(payment);
  }
}
