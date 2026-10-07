import {
  districtPoint,
  planRoute,
  type DriverRoute,
  type RouteStop,
} from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { Listing } from '../../../catalog/domain/entities/listing';
import type { Order } from '../../../orders/domain/entities/order';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { toJobSummary } from '../../domain/entities/job';

/**
 * The driver's run for the day, in the order they agreed to do it (FARM-61).
 *
 * **Planned on the api, not in the app.** The same planner already decides which jobs reach the
 * board, and a driver seeing one order on their route screen while the board was filtered against
 * another would be the two disagreeing about the same day. One answer, computed once, in the place
 * that holds the data.
 *
 * Only live work: `assigned` and `in_transit`. A delivered load is off the lorry and out of the
 * day — the same rule capacity and feasibility already follow.
 */
export class GetDriverRoute {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
  ) {}

  async execute(driverId: string): Promise<DriverRoute> {
    const held = await this.orders.findByAssignedDriver(driverId);
    const live = held.filter(
      (o) => o.status === 'assigned' || o.status === 'in_transit',
    );
    if (live.length === 0) {
      return {
        stops: [],
        feasible: true,
        totalKm: 0,
        totalMinutes: 0,
        totalKg: 0,
      };
    }

    /* One query for every listing, as the board does — see `list-open-jobs.ts` for what fetching
       them one at a time cost. */
    const listings = await this.listings.findByIds(
      live.map((o) => o.listingId),
    );
    const byListingId = new Map(listings.map((l) => [l.id, l]));

    /* A stop with no findable place cannot be drawn or driven to, so it is dropped from the plan
       rather than guessed at — but the order itself still exists and still appears under My jobs.
       The route is a map, not the record. */
    const placed: {
      order: Order;
      listing: Listing;
      point: RouteStop['point'];
    }[] = [];
    for (const order of live) {
      const listing = byListingId.get(order.listingId);
      if (!listing) continue;
      const point = listing.pickupPoint ?? districtPoint(listing.district);
      if (!point) continue;
      placed.push({ order, listing, point });
    }

    const plan = planRoute(
      placed.map(({ order, point }) => ({
        id: order.id,
        point,
        /* What is actually on the lorry once collected; what was ordered before that. */
        quantityKg: order.collectedKg ?? order.quantityKg,
        ...(order.committedWindow ? { window: order.committedWindow } : {}),
      })),
      /* No start point, deliberately: the driver's live location is a later story, and the first
         stop in `placed` is only whichever order the database returned first. Passing it would
         charge the driver an invented first leg from a place they were never at — which is how
         this was first caught, as an 82-minute drive to the stop they start at. Without one, the
         run reads "from wherever you are, to stop 1". */
    );

    const byOrderId = new Map(placed.map((p) => [p.order.id, p]));
    const stops = plan.stops.flatMap((planned) => {
      const match = byOrderId.get(planned.id);
      if (!match) return [];
      const { order, listing, point } = match;
      /* `toJobSummary` needs a job status; everything here is `assigned` or `in_transit` by the
         filter above, so the cast is narrowing rather than assuming. */
      const status = order.status as 'assigned' | 'in_transit';
      return [
        {
          ...toJobSummary(order, listing, status),
          position: planned.position,
          point,
          arrivalMinutes: planned.arrivalMinutes,
          legMinutes: planned.legMinutes,
          ...(planned.slackMinutes !== undefined
            ? { slackMinutes: planned.slackMinutes }
            : {}),
        },
      ];
    });

    return {
      stops,
      feasible: plan.feasible,
      totalKm: plan.totalKm,
      totalMinutes: plan.totalMinutes,
      totalKg: stops.reduce((sum, s) => sum + s.quantityKg, 0),
      ...(plan.tightestSlackMinutes !== undefined
        ? { tightestSlackMinutes: plan.tightestSlackMinutes }
        : {}),
    };
  }
}
