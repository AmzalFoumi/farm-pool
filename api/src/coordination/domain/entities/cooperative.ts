import type { Cooperative as CooperativeDto } from '@farm-pool/shared';

/**
 * A coordinator's farmer group, as the domain sees it. Membership is kept as an array here
 * rather than a field on the farmer's account — see `.plans/coordination/OPEN.md` #1 for why.
 */
export interface Cooperative {
  id: string;
  coordinatorId: string;
  name: string;
  district: string;
  memberFarmerIds: string[];
  createdAt: Date;
}

/** What is needed to create one. The store assigns `id` and `createdAt`. */
export type NewCooperative = Omit<Cooperative, 'id' | 'createdAt'>;

export function toCooperativeDto(cooperative: Cooperative): CooperativeDto {
  return {
    id: cooperative.id,
    coordinatorId: cooperative.coordinatorId,
    name: cooperative.name,
    district: cooperative.district,
    memberFarmerIds: cooperative.memberFarmerIds,
    createdAt: cooperative.createdAt.toISOString(),
  };
}
