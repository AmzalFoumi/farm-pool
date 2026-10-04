import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  NewPayment,
  Payment,
  PaymentEntry,
  TakenPayment,
} from '../../domain/entities/payment';
import type { PaymentRepository } from '../../domain/repositories/payment.repository';
import {
  PAYMENT_MODEL,
  PaymentDocument,
  type PaymentHydrated,
} from './payment.schema';

/** Mongo's code for "a unique index already holds this value". */
const DUPLICATE_KEY = 11000;

@Injectable()
export class MongoosePaymentRepository implements PaymentRepository {
  constructor(
    @InjectModel(PAYMENT_MODEL)
    private readonly payments: Model<PaymentDocument>,
  ) {}

  /* The unique index on `orderId` decides, not a read beforehand: two requests can both read
     "no payment yet", but only one insert can win. */
  async create(payment: NewPayment): Promise<Payment | null> {
    try {
      const doc = await this.payments.create(payment);
      return toPayment(doc);
    } catch (error) {
      if (isDuplicateKey(error)) return null;
      throw error;
    }
  }

  async findByOrder(orderId: string): Promise<Payment | null> {
    const doc = await this.payments.findOne({ orderId }).exec();
    return doc ? toPayment(doc) : null;
  }

  async activate(
    orderId: string,
    gatewayRef: string,
  ): Promise<TakenPayment | null> {
    const doc = await this.payments
      .findOneAndUpdate(
        { orderId, status: 'pending' },
        { status: 'in_escrow', gatewayRef },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? (toPayment(doc) as TakenPayment) : null;
  }

  async release(
    orderId: string,
    entry: PaymentEntry,
  ): Promise<TakenPayment | null> {
    const doc = await this.payments
      .findOneAndUpdate(
        { orderId, status: 'in_escrow', heldAmount: entry.amount },
        { status: 'released', heldAmount: 0, $push: { entries: entry } },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? (toPayment(doc) as TakenPayment) : null;
  }

  async adjust(
    orderId: string,
    expectedHeld: number,
    next: { total: number; heldAmount: number },
    entry: PaymentEntry,
  ): Promise<Payment | null> {
    const doc = await this.payments
      .findOneAndUpdate(
        {
          orderId,
          status: { $in: ['pending', 'in_escrow'] },
          heldAmount: expectedHeld,
        },
        { $set: next, $push: { entries: entry } },
        { returnDocument: 'after' },
      )
      .exec();
    return doc ? toPayment(doc) : null;
  }

  async discardPending(orderId: string): Promise<void> {
    await this.payments.deleteOne({ orderId, status: 'pending' }).exec();
  }

  async remove(id: string): Promise<void> {
    await this.payments.findByIdAndDelete(id).exec();
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY
  );
}

function toPayment(doc: PaymentHydrated): Payment {
  return {
    id: doc._id.toHexString(),
    orderId: doc.orderId,
    buyerId: doc.buyerId,
    farmerId: doc.farmerId,
    total: doc.total,
    advanceAmount: doc.advanceAmount,
    heldAmount: doc.heldAmount,
    status: doc.status,
    method: doc.method,
    ...(doc.gatewayRef ? { gatewayRef: doc.gatewayRef } : {}),
    entries: doc.entries.map((entry) => ({
      kind: entry.kind,
      amount: entry.amount,
      receiptNo: entry.receiptNo,
      at: entry.at,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
