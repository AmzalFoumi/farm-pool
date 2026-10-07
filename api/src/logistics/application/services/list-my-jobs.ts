import type { JobSummary } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { isJobStatus, toJobSummary } from '../../domain/entities/job';

/** The two halves of a driver's own work, which belong on different screens. */
export const LIVE_JOB_STATUSES = ['assigned', 'in_transit'] as const;
export const FINISHED_JOB_STATUSES = ['delivered'] as const;

/**
 * A driver's own jobs, split by whether they still owe someone a trip.
 *
 * **Live and finished are different screens, not one list.** The Jobs tab answers "what am I
 * doing", and a delivered load answers nothing — it is history, and history pushed today's work
 * down the screen. It lives under the profile instead, where a record belongs.
 *
 * No district or capacity filter here, unlike the board: a job the driver already holds is theirs
 * to see whatever it looks like now.
 */
export class ListMyJobs {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(
    driverId: string,
    statuses: readonly string[] = LIVE_JOB_STATUSES,
  ): Promise<JobSummary[]> {
    const mine = await this.orders.findByAssignedDriver(driverId);
    const wanted = mine.filter(
      (o) => isJobStatus(o.status) && statuses.includes(o.status),
    );
    if (wanted.length === 0) return [];

    /* One query for the listings, not one per order — the same N+1 the board had, which measured
       at 14.6s against 131 orders. A driver with a long history would have paid it here. */
    const listings = await this.listings.findByIds(
      wanted.map((o) => o.listingId),
    );
    const byId = new Map(listings.map((l) => [l.id, l]));

    return wanted.flatMap((order) => {
      const listing = byId.get(order.listingId);
      if (!listing || !isJobStatus(order.status)) return [];
      return [toJobSummary(order, listing, order.status)];
    });
  }
}
