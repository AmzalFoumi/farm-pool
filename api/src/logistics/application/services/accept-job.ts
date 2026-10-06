import type { JobDetail } from '@farm-pool/shared';
import type { ListingRepository } from '../../../catalog/domain/repositories/listing.repository';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import {
  committedKg,
  toJobDetail,
  toPickupContact,
} from '../../domain/entities/job';
import { LogisticsError } from '../errors';

/**
 * A driver takes a job (LP-24). `open` → `assigned`, and it leaves every other driver's board.
 *
 * The claim is one atomic repository call, not read-then-write. Two drivers tapping Accept within
 * the same second is the ordinary case on a board with few jobs and several drivers watching it,
 * and the loser has to be told `job_taken` — being quietly handed a job another driver is already
 * driving to is the one outcome worth engineering against here.
 *
 * Refuses a driver with no vehicle: capacity is what decides whether they can carry the load, and
 * the plate is what the farmer checks at the gate (LP-04). Verification state is deliberately
 * *not* checked — nothing moves a driver past `pending` yet (`docs/logistics-driver-role.md`,
 * open question 3), so gating on `verified` would mean no driver could ever accept anything. When
 * that question is answered, this is the line that changes.
 */
export class AcceptJob {
  constructor(
    private readonly orders: OrderRepository,
    private readonly listings: ListingRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(driverId: string, orderId: string): Promise<JobDetail> {
    const driver = await this.users.findById(driverId);
    if (!driver?.driver) {
      throw new LogisticsError(
        'conflict',
        'no_vehicle',
        'Add your vehicle before accepting a job',
      );
    }

    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new LogisticsError(
        'not_found',
        'job_not_found',
        'This job does not exist',
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
    const { capacityKg } = driver.driver;

    /* Two different refusals, because they mean different things to a driver standing at a
       junction deciding what to do next. A load bigger than the whole vehicle can never be taken;
       a load that merely does not fit *today* can be taken after the current run is delivered. One
       code for both would leave the app unable to say which. */
    if (order.quantityKg > capacityKg) {
      throw new LogisticsError(
        'conflict',
        'load_too_heavy',
        'This load is heavier than your vehicle can carry',
      );
    }

    /* The capacity check that was missing: it was per-order, so nothing stopped a driver
       collecting promises that together exceed the lorry — three 600 kg jobs in a 900 kg van is
       three farmers each expecting a collection one vehicle cannot make.

       Known limit: this is read-then-write, unlike the atomic claim below. A driver tapping Accept
       on two jobs in the same instant could still slip past it. That needs a transaction or a
       counter on the account, and it is a far smaller risk than the two-drivers-one-job race —
       that one is several people watching a short board, this one is one person double-tapping a
       phone. Worth fixing when it is seen, not before. */
    const held = await this.orders.findByAssignedDriver(driverId);
    const alreadyCommitted = committedKg(held);
    if (alreadyCommitted + order.quantityKg > capacityKg) {
      const spare = Math.max(0, capacityKg - alreadyCommitted);
      throw new LogisticsError(
        'conflict',
        'vehicle_full',
        `You have ${alreadyCommitted} kg on this trip and room for ${spare} kg more. Deliver what you are carrying, then take this job.`,
      );
    }

    const claimed = await this.orders.assignDriver(orderId, driverId);
    if (!claimed) {
      throw new LogisticsError(
        'conflict',
        'job_taken',
        'Another driver took this job first',
      );
    }

    const farmer = await this.users.findById(claimed.farmerId);
    const pickup = farmer
      ? toPickupContact(claimed, listing, farmer)
      : undefined;
    return toJobDetail(claimed, listing, 'assigned', pickup);
  }
}
