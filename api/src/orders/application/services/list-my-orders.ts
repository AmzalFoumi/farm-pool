import type { Order } from '@farm-pool/shared';
import { toOrderDto } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';

/** The caller's own orders as a buyer, newest first. A farmer's view is a later story. */
export class ListMyOrders {
  constructor(private readonly orders: OrderRepository) {}

  async execute(buyerId: string): Promise<Order[]> {
    const found = await this.orders.findByBuyer(buyerId);
    return found.map(toOrderDto);
  }
}
