import {
  placeOrderSchema,
  type Order,
  type PlaceOrderData,
} from '@farm-pool/shared';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../identity/auth/authenticated-request';
import { CurrentUser } from '../identity/auth/current-user.decorator';
import { Allow } from '../identity/auth/roles.decorator';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { CancelOrder } from './application/services/cancel-order';
import { GetOrder } from './application/services/get-order';
import { ListMyOrders } from './application/services/list-my-orders';
import { PlaceOrder } from './application/services/place-order';

/**
 * HTTP entry points for the orders domain. Thin: validate, call one use-case, return.
 *
 * | Method | Path                | Allow            | Result                              |
 * | ------ | ------------------- | ---------------- | ----------------------------------- |
 * | POST   | /orders             | `order:place`    | 201 `Order` · 404 · 409 · 400       |
 * | GET    | /orders/mine        | `order:read-own` | 200 `Order[]` (caller as buyer)     |
 * | GET    | /orders/:id         | `order:read-own` | 200 `Order` · 403 unless buyer/farmer |
 * | POST   | /orders/:id/cancel  | `order:cancel`   | 200 `Order` · 403 · 409             |
 *
 * `mine` is declared before `:id` so the router does not read it as an id.
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly placeOrder: PlaceOrder,
    private readonly listMyOrders: ListMyOrders,
    private readonly getOrder: GetOrder,
    private readonly cancelOrder: CancelOrder,
  ) {}

  @Allow('order:place')
  @Post()
  place(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(placeOrderSchema)) body: PlaceOrderData,
  ): Promise<Order> {
    return this.placeOrder.execute(user.sub, body);
  }

  @Allow('order:read-own')
  @Get('mine')
  mine(@CurrentUser() user: AuthenticatedUser): Promise<Order[]> {
    return this.listMyOrders.execute(user.sub);
  }

  @Allow('order:read-own')
  @Get(':id')
  one(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Order> {
    return this.getOrder.execute(user.sub, id);
  }

  @Allow('order:cancel')
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Order> {
    return this.cancelOrder.execute(user.sub, id);
  }
}
