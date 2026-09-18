import type { OrderStatus } from '@farm-pool/shared';
import type { NewOrder, Order } from '../entities/order';

export interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  /** Orders placed by this buyer, newest first. */
  findByBuyer(buyerId: string): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
}

export const ORDER_REPOSITORY = Symbol('OrderRepository');
