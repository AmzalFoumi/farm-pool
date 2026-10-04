import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NewPayment, Payment } from '../../domain/entities/payment';
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
    gatewayRef: doc.gatewayRef,
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
