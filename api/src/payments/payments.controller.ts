import {
  proposePriceSchema,
  type Order,
  type Payment,
  type ProposePriceData,
} from '@farm-pool/shared';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { ConfirmReceipt } from './application/services/confirm-receipt';
import { GetPayment } from './application/services/get-payment';
import { PayForOrder } from './application/services/pay-for-order';
import { ProposePrice } from './application/services/propose-price';
import { RespondToPriceProposal } from './application/services/respond-to-price-proposal';

/**
 * HTTP entry points for the payments domain. Thin: call one use-case, return.
 *
 * | Method | Path                          | Allow              | Result                          |
 * | ------ | ----------------------------- | ------------------ | ------------------------------- |
 * | POST   | /payments/orders/:orderId/pay | `payment:pay`      | 201 `Payment` · 403 · 404 · 409 |
 * | GET    | /payments/orders/:orderId     | `payment:read-own` | 200 `Payment` · 403 · 404       |
 * | POST   | /payments/orders/:orderId/confirm-receipt | `order:confirm-receipt` | 200 `Payment` · 403 · 404 · 409 |
 * | POST   | /payments/orders/:orderId/price-proposal | `order:renegotiate` | 200 `Order` · 400 · 403 · 409 |
 * | POST   | /payments/orders/:orderId/price-proposal/accept | `order:renegotiate` | 200 `Order` · 403 · 409 |
 * | POST   | /payments/orders/:orderId/price-proposal/decline | `order:renegotiate` | 200 `Order` · 403 · 409 |
 *
 * Every route is keyed by the order, not by a payment id: there is one payment per order, and
 * the order is the thing the app is already holding.
 */
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payForOrder: PayForOrder,
    private readonly getPayment: GetPayment,
    private readonly confirmReceipt: ConfirmReceipt,
    private readonly proposePrice: ProposePrice,
    private readonly respondToPriceProposal: RespondToPriceProposal,
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

  @Allow('order:confirm-receipt')
  @Post('orders/:orderId/confirm-receipt')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<Payment> {
    return this.confirmReceipt.execute(user.sub, orderId);
  }

  @Allow('order:renegotiate')
  @Post('orders/:orderId/price-proposal')
  @HttpCode(200)
  propose(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(proposePriceSchema)) body: ProposePriceData,
  ): Promise<Order> {
    return this.proposePrice.execute(user.sub, orderId, body);
  }

  @Allow('order:renegotiate')
  @Post('orders/:orderId/price-proposal/accept')
  @HttpCode(200)
  acceptProposal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<Order> {
    return this.respondToPriceProposal.execute(user.sub, orderId, 'accept');
  }

  @Allow('order:renegotiate')
  @Post('orders/:orderId/price-proposal/decline')
  @HttpCode(200)
  declineProposal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId') orderId: string,
  ): Promise<Order> {
    return this.respondToPriceProposal.execute(user.sub, orderId, 'decline');
  }
}
