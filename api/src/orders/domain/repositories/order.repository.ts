import type { OrderStatus } from '@farm-pool/shared';
import type { NewOrder, Order } from '../entities/order';

export interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  /** Orders placed by this buyer, newest first. */
  findByBuyer(buyerId: string): Promise<Order[]>;
  /** Every order in one status, newest first. The driver job board reads `open` through this
   *  rather than querying the `orders` collection from the logistics domain. */
  findByStatus(status: OrderStatus): Promise<Order[]>;
  /** Orders this driver has accepted, newest first. */
  findByAssignedDriver(driverId: string): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
  /**
   * Claim an `open` order for a driver, atomically: sets `assignedDriverId` and moves the status
   * to `assigned`, but only if the order is still `open`. Resolves `null` when it is not — that
   * is the race of two drivers tapping Accept at once, and the loser must be told, not silently
   * given a job someone else holds.
   */
  assignDriver(id: string, driverId: string): Promise<Order | null>;
}

export const ORDER_REPOSITORY = Symbol('OrderRepository');
