import type { Payment } from '@farm-pool/shared';
import { Controller, Get, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { GetPayment } from './application/services/get-payment';
import { PayForOrder } from './application/services/pay-for-order';

/**
 * HTTP entry points for the payments domain. Thin: call one use-case, return.
 *
 * | Method | Path                          | Allow              | Result                          |
 * | ------ | ----------------------------- | ------------------ | ------------------------------- |
 * | POST   | /payments/orders/:orderId/pay | `payment:pay`      | 201 `Payment` · 403 · 404 · 409 |
 * | GET    | /payments/orders/:orderId     | `payment:read-own` | 200 `Payment` · 403 · 404       |
 *
 * Every route is keyed by the order, not by a payment id: there is one payment per order, and
 * the order is the thing the app is already holding.
 */
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payForOrder: PayForOrder,
    private readonly getPayment: GetPayment,
  ) {}

  @Allow('payment:pay')
  @Post('orders/:orderId/pay')
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<Payment> {
    return this.payForOrder.execute(user.sub, orderId);
  }

  @Allow('payment:read-own')
  @Get('orders/:orderId')
  one(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<Payment> {
    return this.getPayment.execute(user.sub, orderId);
  }
}
