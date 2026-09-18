import type { CropId, Order as OrderDto, OrderStatus } from '@farm-pool/shared';

/**
 * A buyer's purchase request against one listing. See the lifecycle in
 * `packages/shared/src/orders/order.ts`; this story writes `requested` and `cancelled` only.
 *
 * `pricePerKg`, `farmerName` and `cropId` are copied from the listing when the order is placed,
 * so a later price change on the listing does not rewrite history.
 */
export interface Order {
  id: string;
  buyerId: string;
  farmerId: string;
  farmerName: string;
  listingId: string;
  cropId: CropId;
  quantityKg: number;
  pricePerKg: number;
  total: number;
  note?: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NewOrder = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;

export function toOrderDto(order: Order): OrderDto {
  return {
    id: order.id,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    farmerName: order.farmerName,
    listingId: order.listingId,
    cropId: order.cropId,
    quantityKg: order.quantityKg,
    pricePerKg: order.pricePerKg,
    total: order.total,
    ...(order.note !== undefined ? { note: order.note } : {}),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
