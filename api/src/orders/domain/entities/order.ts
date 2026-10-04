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
  /** The driver who accepted this job (FARM-49/54). Written only by the logistics domain, and
   *  only through this repository — see `api/src/logistics/README.md`. */
  assignedDriverId?: string;
  /** What the driver actually loaded (LP-50). Set at pickup; never overwritten. */
  collectedKg?: number;
  /** When the buyer confirmed the produce arrived (FARM-51). Set once; never overwritten. */
  receivedAt?: Date;
  /** A new price waiting for the other side's answer (FARM-53). At most one at a time. */
  priceProposal?: PriceProposal;
  createdAt: Date;
  updatedAt: Date;
}

/** `PriceProposal` from shared, with its date as a `Date`. */
export interface PriceProposal {
  proposedBy: 'buyer' | 'farmer';
  pricePerKg: number;
  reason?: string;
  proposedAt: Date;
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
    ...(order.assignedDriverId !== undefined
      ? { assignedDriverId: order.assignedDriverId }
      : {}),
    ...(order.collectedKg !== undefined
      ? { collectedKg: order.collectedKg }
      : {}),
    ...(order.receivedAt !== undefined
      ? { receivedAt: order.receivedAt.toISOString() }
      : {}),
    ...(order.priceProposal !== undefined
      ? {
          priceProposal: {
            proposedBy: order.priceProposal.proposedBy,
            pricePerKg: order.priceProposal.pricePerKg,
            ...(order.priceProposal.reason !== undefined
              ? { reason: order.priceProposal.reason }
              : {}),
            proposedAt: order.priceProposal.proposedAt.toISOString(),
          },
        }
      : {}),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
