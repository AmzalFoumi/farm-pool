import type { Order } from '@farm-pool/shared';
import { toOrderDto } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderError } from '../errors';

/**
 * The buyer withdraws a request. Only the buyer who placed it; only while it is still
 * `requested`. Once a farmer has accepted, cancelling is a conversation, not a button.
 */
export class CancelOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(buyerId: string, id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new OrderError(
        'not_found',
        'order_not_found',
        'This order does not exist',
      );
    }
    if (order.buyerId !== buyerId) {
      throw new OrderError(
        'forbidden',
        'not_your_order',
        'Only the buyer who placed an order can cancel it',
      );
    }
    if (order.status !== 'requested') {
      throw new OrderError(
        'conflict',
        'order_not_cancellable',
        'This order can no longer be cancelled',
      );
    }
    const cancelled = await this.orders.updateStatus(id, 'cancelled');
    return toOrderDto(cancelled);
  }
}
