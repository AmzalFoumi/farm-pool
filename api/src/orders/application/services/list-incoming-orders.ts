import type { Order } from '@farm-pool/shared';
import { toOrderDto } from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';

/** The orders placed against the caller's listings, newest first (FARM-46). */
export class ListIncomingOrders {
  constructor(private readonly orders: OrderRepository) {}

  async execute(farmerId: string): Promise<Order[]> {
    const found = await this.orders.findByFarmer(farmerId);
    return found.map(toOrderDto);
  }
}
