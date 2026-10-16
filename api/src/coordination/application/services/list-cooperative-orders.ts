import type { Order } from '@farm-pool/shared';
import { toOrderDto } from '../../../orders/domain/entities/order';
import type { OrderRepository } from '../../../orders/domain/repositories/order.repository';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import { CoordinationError } from '../errors';

/**
 * Every order against this coordinator's cooperative farmers, any status (FARM-43 follow-up) —
 * the coordinator's Disputes tab monitors from this, computing its stats client-side the same way
 * `cooperative-listings.tsx` does for listings. Read-only: the coordinator does not mediate or
 * resolve anything here, only sees enough to call a farmer outside the app if something looks
 * wrong (`.plans/PRODUCT.md`'s open question on how far dispute authority goes stays unanswered).
 */
export class ListCooperativeOrders {
  constructor(
    private readonly cooperatives: CooperativeRepository,
    private readonly orders: OrderRepository,
  ) {}

  async execute(coordinatorId: string): Promise<Order[]> {
    const [cooperative] =
      await this.cooperatives.findByCoordinatorId(coordinatorId);
    if (!cooperative) {
      throw new CoordinationError(
        'not_found',
        'cooperative_not_found',
        'You do not run a cooperative yet',
      );
    }

    const orders = await this.orders.findByFarmerIds(
      cooperative.memberFarmerIds,
      1000,
    );
    return orders.map(toOrderDto);
  }
}
