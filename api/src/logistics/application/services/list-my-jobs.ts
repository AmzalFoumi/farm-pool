import type { JobSummary } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { isJobStatus, toJobSummary } from '../../domain/entities/job';

/**
 * The jobs this driver has accepted — everything from `assigned` through `delivered`, newest
 * first. No district or capacity filter here: a job they already hold is theirs to see whatever
 * it looks like now.
 */
export class ListMyJobs {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(driverId: string): Promise<JobSummary[]> {
    const mine = await this.orders.findByAssignedDriver(driverId);

    const jobs: JobSummary[] = [];
    for (const order of mine) {
      if (!isJobStatus(order.status)) continue;
      const listing = await this.listings.findById(order.listingId);
      if (!listing) continue;
      jobs.push(toJobSummary(order, listing, order.status));
    }
    return jobs;
  }
}
