import type { Order } from '@farm-pool/shared';
import { toOrderDto } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderError } from '../errors';

/** One order, visible to its buyer and its farmer only. Anyone else gets 403. */
export class GetOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(callerId: string, id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new OrderError(
        'not_found',
        'order_not_found',
        'This order does not exist',
      );
    }
    if (order.buyerId !== callerId && order.farmerId !== callerId) {
      throw new OrderError(
        'forbidden',
        'not_your_order',
        'Only the buyer and the farmer on an order can see it',
      );
    }
    return toOrderDto(order);
  }
}
