import { paymentEntryKindSchema, paymentMethodSchema } from '@farm-pool/shared';
import type { PaymentEntryKind, PaymentMethod } from '@farm-pool/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import {
  STORED_PAYMENT_STATUSES,
  type StoredPaymentStatus,
} from '../../domain/entities/payment';

/** One movement of money. Embedded: an entry is never read without its payment. */
@Schema({ _id: false })
export class PaymentEntryDocument {
  @Prop({ type: String, required: true, enum: paymentEntryKindSchema.options })
  kind: PaymentEntryKind;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  receiptNo: string;

  @Prop({ required: true })
  at: Date;
}

const PaymentEntrySchema = SchemaFactory.createForClass(PaymentEntryDocument);

/** Storage shape of the escrow record in the `payments` collection. One per order. */
@Schema({ collection: 'payments', timestamps: true })
export class PaymentDocument {
  /** Unique: this index is what makes paying twice impossible, not a check in a use-case. */
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop({ required: true, index: true })
  buyerId: string;

  @Prop({ required: true, index: true })
  farmerId: string;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: true, min: 0 })
  advanceAmount: number;

  @Prop({ required: true, min: 0 })
  heldAmount: number;

  @Prop({
    type: String,
    required: true,
    enum: STORED_PAYMENT_STATUSES,
    index: true,
  })
  status: StoredPaymentStatus;

  @Prop({ type: String, required: true, enum: paymentMethodSchema.options })
  method: PaymentMethod;

  /** Absent while `pending`: the charge has not come back yet. */
  @Prop()
  gatewayRef?: string;

  @Prop({ type: [PaymentEntrySchema], default: [] })
  entries: PaymentEntryDocument[];

  createdAt: Date;
  updatedAt: Date;
}

export type PaymentHydrated = HydratedDocument<PaymentDocument>;

export const PaymentSchema = SchemaFactory.createForClass(PaymentDocument);

export const PAYMENT_MODEL = PaymentDocument.name;
