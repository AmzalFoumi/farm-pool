import type { PublicUser } from '@farm-pool/shared';
import { toPublicUser } from '../../../identity/domain/entities/user';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * A coordinator accepting a pending farmer into their own cooperative (FARM-44). Checks the
 * farmer is actually a pending member of *this* coordinator's cooperative before writing
 * anything — a coordinator can only approve their own applicants, never an arbitrary user id.
 */
export class ApproveFarmer {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(coordinatorId: string, farmerId: string): Promise<PublicUser> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }
    if (!cooperative.memberFarmerIds.includes(farmerId)) {
      throw new CoordinationError(
        'not_found',
        'farmer_not_found',
        'This farmer is not in your cooperative',
      );
    }

    const activated = await this.users.activate(farmerId);
    if (!activated) {
      throw new CoordinationError(
        'conflict',
        'farmer_not_pending',
        'This farmer is not awaiting approval',
      );
    }

    return toPublicUser(activated);
  }
}
