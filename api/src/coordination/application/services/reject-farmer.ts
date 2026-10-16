import type { PublicUser } from '@farm-pool/shared';
import { toPublicUser } from '../../../identity/domain/entities/user';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * A coordinator rejecting a pending farmer, with a mandatory reason (FARM-44): the account moves
 * to `suspended`, carrying the reason so the farmer sees it on their own account-status screen,
 * and is removed from the cooperative's member list. There is no "reactivate a suspended
 * account" anywhere in the product today, so this is effectively permanent — the same
 * limitation `suspended` already carries everywhere else, not a new one.
 */
export class RejectFarmer {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(
    coordinatorId: string,
    farmerId: string,
    reason: string,
  ): Promise<PublicUser> {
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

    const rejected = await this.users.reject(farmerId, reason);
    if (!rejected) {
      throw new CoordinationError(
        'conflict',
        'farmer_not_pending',
        'This farmer is not awaiting approval',
      );
    }

    await this.cooperatives.removeMember(cooperative.id, farmerId);
    return toPublicUser(rejected);
  }
}
