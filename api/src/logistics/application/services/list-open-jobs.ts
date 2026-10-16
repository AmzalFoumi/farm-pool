import {
  districtPoint,
  firstFeasibleSlot,
  MIN_COMMITTED_MINUTES,
  type JobSummary,
  type RouteStop,
} from '@farm-pool/shared';
import type { Order } from '../../../orders/domain/entities/order';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { toJobSummary } from '../../domain/entities/job';
import { LogisticsError } from '../errors';

/**
 * The job board (LP-20, LP-23).
 *
 * Shows only `open` orders — LP-21, the constraint the whole board exists to honour: a driver
 * must never be offered a trip to collect produce nobody has bought. That is enforced by reading
 * one status, not by filtering a wider list, so a new status cannot quietly become visible here.
 *
 * Two filters, both from the driver's own vehicle rather than from query parameters:
 *
 * - **District** — a driver is shown their operating district only. A Kurunegala driver scrolling
 *   past Jaffna jobs they will never take is the board being useless on a 3G connection.
 * - **Capacity** — a job heavier than the vehicle is not an offer, it is a mistake waiting to be
 *   made at a farm gate. Hiding it is cheaper than a driver discovering it on arrival.
 *
 * Both are deliberately server-side: the client could filter, but then the wire carries every
 * open job in the country to a phone that wanted four of them.
 */
export class ListOpenJobs {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(driverId: string): Promise<JobSummary[]> {
    const driver = await this.users.findById(driverId);
    if (!driver?.driver) {
      throw new LogisticsError(
        'conflict',
        'no_vehicle',
        'Add your vehicle before you can see jobs',
      );
    }
    const { operatingDistrict, capacityKg } = driver.driver;

    const open = await this.orders.findByStatus('open');

    /**
     * The driver's day as it already stands (FARM-61). Built **once** for the whole board, not
     * once per candidate: the expensive part is reading what they hold, and every job on the board
     * is tested against the same answer.
     */
    const held = await this.orders.findByAssignedDriver(driverId);
    const route = await this.heldStops(held);

    /* Drop what the vehicle cannot carry before touching the catalogue at all — a listing fetched
       for a job the driver can never take is a round trip spent on nothing. */
    const carriable = open.filter((order) => order.quantityKg <= capacityKg);

    /**
     * One query for every listing, not one per order.
     *
     * This loop used to call `findById` per order, which made the board O(n) in *all* open orders
     * platform-wide — not just this driver's district. Measured at 14 seconds against 131 open
     * orders, with the app's own request timeout at 15, so the board was a second away from being
     * unusable and would only get worse as the platform grew.
     */
    const listings = await this.listings.findByIds(
      carriable.map((order) => order.listingId),
    );
    const byId = new Map(listings.map((listing) => [listing.id, listing]));

    const jobs: JobSummary[] = [];
    for (const order of carriable) {
      const listing = byId.get(order.listingId);
      /* An order whose listing has been deleted is not a job anyone can drive to. Skipped rather
         than thrown: one broken row must not empty the whole board. */
      if (!listing) continue;
      if (!sameDistrict(listing.district, operatingDistrict)) continue;

      /**
       * Could the driver actually promise this one and still keep everything already promised?
       *
       * Checked here rather than left to the Accept button on purpose. A board that offers work
       * the driver will be refused makes them find out one tap at a time, and the information is
       * the same either way — so it belongs where the list is built. A job with no window on its
       * listing is always offered: there is no promise to test, and the time is agreed by phone
       * as it always was.
       */
      const point = listing.pickupPoint ?? districtPoint(listing.district);
      if (listing.collectionWindow && point) {
        const slot = firstFeasibleSlot(
          route,
          { id: order.id, point, quantityKg: order.quantityKg },
          listing.collectionWindow,
          MIN_COMMITTED_MINUTES * 2,
          route.at(-1)?.point ?? point,
        );
        if (!slot) continue;
      }

      jobs.push(toJobSummary(order, listing, 'open'));
    }
    return jobs;
  }

  /**
   * The stops a driver still owes someone, as the planner sees them.
   *
   * Only `assigned` and `in_transit` count — a delivered load is off the lorry and out of the day,
   * the same rule capacity already follows. A held job whose listing has gone is skipped rather
   * than guessed at.
   */
  private async heldStops(held: readonly Order[]): Promise<RouteStop[]> {
    const live = held.filter(
      (o) => o.status === 'assigned' || o.status === 'in_transit',
    );
    if (live.length === 0) return [];

    const listings = await this.listings.findByIds(
      live.map((o) => o.listingId),
    );
    const byId = new Map(listings.map((l) => [l.id, l]));

    return live.flatMap((order) => {
      const listing = byId.get(order.listingId);
      const point =
        listing?.pickupPoint ?? districtPoint(listing?.district ?? '');
      if (!point) return [];
      return [
        {
          id: order.id,
          point,
          quantityKg: order.collectedKg ?? order.quantityKg,
          ...(order.committedWindow ? { window: order.committedWindow } : {}),
        },
      ];
    });
  }
}

/** Districts are free text on both sides (`districtSchema`), so they are compared the way a
 *  person would: case and surrounding space do not make two places different. */
function sameDistrict(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
