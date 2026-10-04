import type { OrderStatus } from '@farm-pool/shared';
import type { NewOrder, Order, PriceProposal } from '../entities/order';

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
  /**
   * The driver confirms the load is on the vehicle (LP-50): `assigned` → `in_transit`, recording
   * what was actually collected. Matches on the driver *and* the status in one operation, so the
   * "is this your job" check cannot drift away from the write it guards. Resolves `null` when the
   * job is not this driver's or not at that stage.
   */
  recordPickup(
    id: string,
    driverId: string,
    collectedKg: number,
  ): Promise<Order | null>;
  /** The driver confirms drop-off (LP-52): `in_transit` → `delivered`. Same filter-as-guard. */
  recordDelivery(id: string, driverId: string): Promise<Order | null>;
  /**
   * The buyer has paid (FARM-41): `accepted` → `open`, which is what puts the order on the
   * driver job board. Matches on the buyer *and* the status in one operation. Resolves `null`
   * when the order is not this buyer's or is not waiting to be paid for.
   */
  markPaid(id: string, buyerId: string): Promise<Order | null>;
  /**
   * The buyer confirms the produce arrived (FARM-51): stamps `receivedAt` on a `delivered` order
   * that has none. The status stays `delivered`. Resolves `null` when the order is not this
   * buyer's, is not delivered yet, or was already confirmed — so a second tap changes nothing.
   */
  markReceived(id: string, buyerId: string): Promise<Order | null>;
  /**
   * Put a new price to the other side (FARM-53). Written only while the price may still change
   * (`RENEGOTIABLE_ORDER_STATUSES`) and only if no proposal is already open. Resolves `null`
   * otherwise.
   */
  setPriceProposal(id: string, proposal: PriceProposal): Promise<Order | null>;
  /**
   * Answer the open proposal, identified by when it was made so a stale answer cannot settle a
   * newer one. With `accepted`, the order takes that price and total — only while the price may
   * still change. Without it, the proposal is just removed. Resolves `null` when that proposal
   * is no longer the open one, or the order has moved past pickup.
   */
  resolvePriceProposal(
    id: string,
    proposedAt: Date,
    accepted?: { pricePerKg: number; total: number },
  ): Promise<Order | null>;
}

export const ORDER_REPOSITORY = Symbol('OrderRepository');
