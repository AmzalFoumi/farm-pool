import type { Cooperative as CooperativeDto } from '@farm-pool/shared';
import type { UserRepository } from '../../../identity/domain/repositories/user.repository';
import { toCooperativeDto } from '../../domain/entities/cooperative';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * A farmer naming the district they farm in, right after registering, while still
 * `pending_review` (FARM-44). Finds the cooperative that covers it and adds them as a member —
 * which is also what makes them visible to that coordinator's Farmers list and "Needs you
 * today" (`ListCooperativeFarmers`, `GetCoordinatorTasks`), both already filtering on
 * `memberFarmerIds`. Also records the district on the farmer's own account, so the coordinator
 * reviewing them sees it even before any listing exists.
 *
 * Idempotent: `addMember` never duplicates, so calling this twice (a retry after a dropped
 * connection, or trying again once a cooperative exists) is always safe.
 */
export class JoinCooperative {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(farmerId: string, district: string): Promise<CooperativeDto> {
    const cooperative = await this.cooperatives.findByDistrict(district);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'no_cooperative_for_district',
        'No coordinator currently covers this district',
      );
    }

    const updated = await this.cooperatives.addMember(cooperative.id, farmerId);
    if (!updated) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'This cooperative no longer exists',
      );
    }

    await this.users.saveFarmerDistrict(farmerId, district);
    return toCooperativeDto(updated);
  }
}
