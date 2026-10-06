import { distanceKm } from '@farm-pool/shared';
import type {
  AssignedDriver,
  JobDetail,
  JobSummary,
  PickupContact,
} from '@farm-pool/shared';
import type { Listing } from '../../../catalog/domain/entities/listing';
import type { User } from '../../../identity/domain/entities/user';
import type { Order } from '../../../orders/domain/entities/order';

/**
 * A job is an order plus the place it is collected from.
 *
 * There is no `Job` interface and no `jobs` collection: LP-21 says a job exists only for a
 * confirmed order, and the cheapest way to guarantee that is to have nothing to keep in sync. So
 * this file is mappers, not state — the order carries the deal and the assignment, the listing
 * carries the location, and a job is the two read together.
 *
 * The statuses a job can be in are the delivery half of the order lifecycle. Anything earlier
 * (`requested`, `accepted`) is not yet work for a driver, and `declined` / `cancelled` never
 * become one.
 */
const JOB_STATUSES = ['open', 'assigned', 'in_transit', 'delivered'] as const;

type JobStatus = (typeof JOB_STATUSES)[number];

export function isJobStatus(status: Order['status']): status is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(status);
}

/**
 * How much of a vehicle is already spoken for.
 *
 * A job occupies the lorry from the moment it is accepted, not from the moment it is loaded: a
 * driver who has promised a farmer a collection has committed that space, and a second promise
 * made against the same space is one of the two farmers being let down. So `assigned` counts as
 * much as `in_transit`.
 *
 * `delivered` does not count. The load is off the vehicle and the space is real again, which is
 * what makes a driver's second trip of the day possible without any trip or route concept.
 *
 * Once a job is picked up, `collectedKg` is what is actually on the lorry and `quantityKg` is only
 * what was ordered — so the real weight wins where we have it. A driver who collected 400 kg
 * against a 600 kg order genuinely has 200 kg more room, and should not be refused work for
 * kilograms that were never harvested.
 */
export function committedKg(jobs: readonly Order[]): number {
  return jobs
    .filter((o) => o.status === 'assigned' || o.status === 'in_transit')
    .reduce((total, o) => total + (o.collectedKg ?? o.quantityKg), 0);
}

/**
 * The board row. Deliberately carries no phone number: a driver browsing open work has no
 * business holding a farmer's contact details for a job they have not taken.
 */
export function toJobSummary(
  order: Order,
  listing: Listing,
  status: JobStatus,
): JobSummary {
  return {
    id: order.id,
    listingId: order.listingId,
    cropId: order.cropId,
    quantityKg: order.quantityKg,
    pricePerKg: order.pricePerKg,
    total: order.total,
    farmerName: order.farmerName,
    district: listing.district,
    ...(listing.town !== undefined ? { town: listing.town } : {}),
    ...(listing.pickupPoint !== undefined
      ? { pickupPoint: listing.pickupPoint }
      : {}),
    ...(order.dropOff !== undefined ? { dropOff: order.dropOff } : {}),
    /* Only when both ends are real. A distance measured from a district centre would be a precise
       number built on a guess — and a driver quoting a fee from it would be wrong by however far
       the gate is from the town. Absent is honest; approximate is not. */
    ...(listing.pickupPoint && order.dropOff
      ? {
          distanceKm:
            Math.round(
              distanceKm(listing.pickupPoint, order.dropOff.point) * 10,
            ) / 10,
        }
      : {}),
    ...(listing.fulfillmentOption !== undefined
      ? { fulfillmentOption: listing.fulfillmentOption }
      : {}),
    status,
    createdAt: order.createdAt.toISOString(),
  };
}

/**
 * The job detail. `pickup` is passed in rather than derived here so the caller — which is the
 * only place that knows whether this driver holds the job — decides whether contact details are
 * disclosed at all. A mapper that could decide that itself would be one refactor away from
 * leaking it.
 */
export function toJobDetail(
  order: Order,
  listing: Listing,
  status: JobStatus,
  pickup?: PickupContact,
): JobDetail {
  return {
    ...toJobSummary(order, listing, status),
    ...(order.note !== undefined ? { note: order.note } : {}),
    ...(pickup !== undefined ? { pickup } : {}),
    ...(order.collectedKg !== undefined
      ? { collectedKg: order.collectedKg }
      : {}),
  };
}

export function toPickupContact(
  order: Order,
  listing: Listing,
  farmer: User,
): PickupContact {
  return {
    farmerName: order.farmerName,
    farmerPhone: farmer.phone,
    district: listing.district,
    ...(listing.town !== undefined ? { town: listing.town } : {}),
    ...(listing.address !== undefined ? { address: listing.address } : {}),
    ...(listing.farmgateNotes !== undefined
      ? { farmgateNotes: listing.farmgateNotes }
      : {}),
  };
}

/**
 * The driver as a farmer sees them at the gate (LP-04, LP-51). Returns `undefined` for an account
 * with no vehicle on it, because a driver without a vehicle is nothing a farmer can check a
 * plate against — the caller turns that into `no_driver_assigned` rather than showing a half card.
 */
export function toAssignedDriver(driver: User): AssignedDriver | undefined {
  if (!driver.driver) return undefined;
  return {
    id: driver.id,
    displayName: driver.displayName,
    phone: driver.phone,
    vehicleType: driver.driver.vehicleType,
    registration: driver.driver.registration,
    capacityKg: driver.driver.capacityKg,
    operatingDistrict: driver.driver.operatingDistrict,
    verification: driver.driver.verification,
  };
}
