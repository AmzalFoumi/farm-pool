import { RENEGOTIABLE_ORDER_STATUSES } from '@farm-pool/shared';
import type { OrderStatus } from '@farm-pool/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  NewOrder,
  Order,
  PriceProposal,
} from '../../domain/entities/order';
import type { OrderRepository } from '../../domain/repositories/order.repository';
import { ORDER_MODEL, OrderDocument, type OrderHydrated } from './order.schema';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class MongooseOrderRepository implements OrderRepository {
  constructor(
    @InjectModel(ORDER_MODEL) private readonly orders: Model<OrderDocument>,
  ) {}

  async create(order: NewOrder): Promise<Order> {
    const doc = await this.orders.create(order);
    return toOrder(doc);
  }

  async findById(id: string): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders.findById(id).exec();
    return doc ? toOrder(doc) : null;
  }

  async findByBuyer(buyerId: string): Promise<Order[]> {
    const docs = await this.orders
      .find({ buyerId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(toOrder);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const docs = await this.orders
      .find({ status })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(toOrder);
  }

  async findByAssignedDriver(driverId: string): Promise<Order[]> {
    const docs = await this.orders
      .find({ assignedDriverId: driverId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(toOrder);
  }

  /* `findOneAndUpdate` with `status: 'open'` in the filter is what makes this a claim rather
     than a write: Mongo matches and updates in one operation, so the second driver's filter
     finds nothing and gets `null` instead of overwriting the first driver's assignment. */
  async assignDriver(id: string, driverId: string): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        { _id: id, status: 'open' },
        { status: 'assigned', assignedDriverId: driverId },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  /* Driver and status both sit in the filter, not in an `if` above it. A separate read-then-check
     would be a window in which the job could change hands. */
  async recordPickup(
    id: string,
    driverId: string,
    collectedKg: number,
  ): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        { _id: id, assignedDriverId: driverId, status: 'assigned' },
        { status: 'in_transit', collectedKg },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  async recordDelivery(id: string, driverId: string): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        { _id: id, assignedDriverId: driverId, status: 'in_transit' },
        { status: 'delivered' },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  async markPaid(
    id: string,
    buyerId: string,
    expectedTotal: number,
  ): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        { _id: id, buyerId, status: 'accepted', total: expectedTotal },
        { status: 'open' },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  async markReceived(id: string, buyerId: string): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        {
          _id: id,
          buyerId,
          status: 'delivered',
          receivedAt: { $exists: false },
        },
        { receivedAt: new Date() },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  async setPriceProposal(
    id: string,
    proposal: PriceProposal,
  ): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        {
          _id: id,
          status: { $in: RENEGOTIABLE_ORDER_STATUSES },
          priceProposal: { $exists: false },
        },
        { $set: { priceProposal: proposal } },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  async resolvePriceProposal(
    id: string,
    proposedAt: Date,
    accepted?: { pricePerKg: number; total: number },
  ): Promise<Order | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.orders
      .findOneAndUpdate(
        {
          _id: id,
          'priceProposal.proposedAt': proposedAt,
          ...(accepted ? { status: { $in: RENEGOTIABLE_ORDER_STATUSES } } : {}),
        },
        {
          $unset: { priceProposal: 1 },
          ...(accepted ? { $set: accepted } : {}),
        },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toOrder(doc) : null;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const doc = await this.orders
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();
    if (!doc) throw new Error(`Order ${id} vanished during update`);
    return toOrder(doc);
  }
}

function toOrder(doc: OrderHydrated): Order {
  return {
    id: doc._id.toHexString(),
    buyerId: doc.buyerId,
    farmerId: doc.farmerId,
    farmerName: doc.farmerName,
    listingId: doc.listingId,
    cropId: doc.cropId,
    quantityKg: doc.quantityKg,
    pricePerKg: doc.pricePerKg,
    total: doc.total,
    ...(typeof doc.note === 'string' ? { note: doc.note } : {}),
    status: doc.status,
    ...(typeof doc.assignedDriverId === 'string'
      ? { assignedDriverId: doc.assignedDriverId }
      : {}),
    ...(typeof doc.collectedKg === 'number'
      ? { collectedKg: doc.collectedKg }
      : {}),
    ...(doc.receivedAt instanceof Date ? { receivedAt: doc.receivedAt } : {}),
    ...(doc.priceProposal
      ? {
          priceProposal: {
            proposedBy: doc.priceProposal.proposedBy,
            pricePerKg: doc.priceProposal.pricePerKg,
            ...(typeof doc.priceProposal.reason === 'string'
              ? { reason: doc.priceProposal.reason }
              : {}),
            proposedAt: doc.priceProposal.proposedAt,
          },
        }
      : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
