import type { AssignedDriver } from '@farm-pool/shared';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import { toAssignedDriver } from '../../domain/entities/job';
import { LogisticsError } from '../errors';

/**
 * Who is driving this order (LP-04, LP-51) — the requirement the whole verification feature
 * exists for. A farmer opens this at the gate, with the vehicle in front of them, and checks the
 * plate on the screen against the plate on the lorry before handing over produce.
 *
 * Readable by the order's farmer, its buyer, and the driver themselves. Not by anyone else: the
 * permission matrix lets every role call the endpoint, so the participant check below is the
 * whole of the access control, not a second layer over it.
 *
 * Read live from the account, never snapshotted onto the order. If a driver's verification is
 * revoked, every screen showing their badge must go cold immediately — a farmer trusting a stale
 * `verified` is exactly the harm this feature is meant to prevent.
 */
export class GetAssignedDriver {
  constructor(
    private readonly orders: OrderRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(callerId: string, orderId: string): Promise<AssignedDriver> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new LogisticsError(
        'not_found',
        'job_not_found',
        'This job does not exist',
      );
    }

    const isParticipant =
      order.farmerId === callerId ||
      order.buyerId === callerId ||
      order.assignedDriverId === callerId;
    if (!isParticipant) {
      throw new LogisticsError(
        'forbidden',
        'not_your_job',
        'Only the people on this order can see its driver',
      );
    }

    if (!order.assignedDriverId) {
      throw new LogisticsError(
        'not_found',
        'no_driver_assigned',
        'No driver has taken this order yet',
      );
    }

    const driver = await this.users.findById(order.assignedDriverId);
    const assigned = driver ? toAssignedDriver(driver) : undefined;
    if (!assigned) {
      throw new LogisticsError(
        'not_found',
        'no_driver_assigned',
        'No driver has taken this order yet',
      );
    }
    return assigned;
  }
}
