import type { JobDetail } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import {
  isJobStatus,
  toJobDetail,
  toPickupContact,
} from '../../domain/entities/job';
import { LogisticsError } from '../errors';

/**
 * One job, for a driver.
 *
 * The disclosure rule lives here and only here: **the farmer's phone number is attached when the
 * caller is the driver who accepted this job, and not otherwise.** An open job on the board is
 * readable by any driver — that is what makes it a board — but it carries no contact details, so
 * the endpoint cannot be walked to collect farmers' numbers.
 *
 * A job someone else holds is `not_your_job` rather than a stripped-down detail: telling a driver
 * the work is gone is more use than showing them a page with no button on it.
 */
export class GetJob {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(driverId: string, orderId: string): Promise<JobDetail> {
    const order = await this.orders.findById(orderId);
    if (!order || !isJobStatus(order.status)) {
      throw new LogisticsError(
        'not_found',
        'job_not_found',
        'This job does not exist',
      );
    }

    const mine = order.assignedDriverId === driverId;
    if (order.assignedDriverId !== undefined && !mine) {
      throw new LogisticsError(
        'forbidden',
        'not_your_job',
        'Another driver has taken this job',
      );
    }

    const listing = await this.listings.findById(order.listingId);
    if (!listing) {
      throw new LogisticsError(
        'not_found',
        'job_not_found',
        'This job does not exist',
      );
    }

    if (!mine) return toJobDetail(order, listing, order.status);

    const farmer = await this.users.findById(order.farmerId);
    /* A held job whose farmer account has gone still shows the work; it just has nobody to call.
       Better than a 404 on a job the driver is standing at the gate for. */
    const pickup = farmer ? toPickupContact(order, listing, farmer) : undefined;
    return toJobDetail(order, listing, order.status, pickup);
  }
}
