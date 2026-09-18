import type { OrderStatus } from '@farm-pool/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NewOrder, Order } from '../../domain/entities/order';
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
