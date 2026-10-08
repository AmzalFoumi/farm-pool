import type { Order } from '@farm-pool/shared';
import { toOrderDto } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderError } from '../errors';

/**
 * The farmer answers a purchase request (FARM-46). Only the farmer it was sent to; only while it
 * is still `requested`. Accepting moves it to `accepted`, where it waits for the buyer to pay
 * (FARM-41). Declining ends it.
 */
export class RespondToOrder {
  constructor(private readonly orders: OrderRepository) {}

  async execute(
    farmerId: string,
    id: string,
    answer: 'accepted' | 'declined',
  ): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new OrderError(
        'not_found',
        'order_not_found',
        'This order does not exist',
      );
    }
    if (order.farmerId !== farmerId) {
      throw new OrderError(
        'forbidden',
        'not_your_order',
        'Only the farmer an order was sent to can answer it',
      );
    }
    const answered = await this.orders.answerRequest(id, farmerId, answer);
    if (!answered) {
      throw new OrderError(
        'conflict',
        'order_not_answerable',
        'This order has already been answered or cancelled',
      );
    }
    return toOrderDto(answered);
  }
}
