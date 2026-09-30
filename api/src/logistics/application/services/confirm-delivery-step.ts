import type { JobDetail } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { Order } from '../../../orders/domain/entities/order';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import {
  isJobStatus,
  toJobDetail,
  toPickupContact,
} from '../../domain/entities/job';
import { LogisticsError } from '../errors';

/**
 * The two fulfilment confirmations a driver makes (LP-50, LP-52): the load is on the vehicle, and
 * the load is off it. They share a base class because everything except the repository call is
 * identical, and two near-copies would drift apart at the first bug fix.
 *
 * **The guard is the write.** Each repository method matches on the driver *and* the stage as part
 * of the update, so there is no window between checking "is this your job, is it at this stage"
 * and acting on the answer. The cost is that a refusal does not say which of the three things was
 * wrong, which is what `explain` is for — the extra read happens only on the failing path.
 */
abstract class ConfirmDeliveryStep {
  constructor(
    protected readonly orders: OrderRepository,
    protected readonly listings: ListingRepository,
    protected readonly users: UserRepository,
  ) {}

  /** Shape the moved order as a job, or work out why it did not move. */
  protected async finish(
    driverId: string,
    orderId: string,
    moved: Order | null,
  ): Promise<JobDetail> {
    if (!moved) return this.explain(driverId, orderId);

    const listing = await this.listings.findById(moved.listingId);
    if (!listing || !isJobStatus(moved.status)) {
      throw new LogisticsError(
        'not_found',
        'job_not_found',
        'This job does not exist',
      );
    }

    const farmer = await this.users.findById(moved.farmerId);
    const pickup = farmer ? toPickupContact(moved, listing, farmer) : undefined;
    return toJobDetail(moved, listing, moved.status, pickup);
  }

  /**
   * Turn a refused write into the reason for it. Always throws.
   *
   * A driver holding a phone at a farm gate needs to know whether they are at the wrong job or
   * the wrong step, so the three cases stay distinct rather than collapsing into one "could not
   * confirm".
   */
  private async explain(driverId: string, orderId: string): Promise<never> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new LogisticsError(
        'not_found',
        'job_not_found',
        'This job does not exist',
      );
    }
    if (order.assignedDriverId !== driverId) {
      throw new LogisticsError(
        'forbidden',
        'not_your_job',
        'This job is not yours',
      );
    }
    throw new LogisticsError(
      'conflict',
      'wrong_stage',
      order.status === 'delivered'
        ? 'This job is already finished'
        : 'Confirm the pickup before the drop-off',
    );
  }
}

/**
 * Pickup (LP-50): `assigned` → `in_transit`, recording what was actually loaded.
 *
 * The collected weight is written, not validated against the order. A farmer harvesting 95 kg
 * against a 100 kg order is the ordinary case, and an api that refused it would leave the driver
 * with no way to record the truth — so the number they type is the number stored, and the
 * difference becomes something the farmer, buyer and coordinator can see.
 */
export class ConfirmPickup extends ConfirmDeliveryStep {
  async execute(
    driverId: string,
    orderId: string,
    collectedKg: number,
  ): Promise<JobDetail> {
    const moved = await this.orders.recordPickup(
      orderId,
      driverId,
      collectedKg,
    );
    return this.finish(driverId, orderId, moved);
  }
}

/** Drop-off (LP-52): `in_transit` → `delivered`. The end of this domain's half of the lifecycle. */
export class ConfirmDelivery extends ConfirmDeliveryStep {
  async execute(driverId: string, orderId: string): Promise<JobDetail> {
    const moved = await this.orders.recordDelivery(orderId, driverId);
    return this.finish(driverId, orderId, moved);
  }
}
