import { CROP_IDS, orderStatusSchema } from '@farm-pool/shared';
import type { CropId, OrderStatus } from '@farm-pool/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** A price waiting for an answer (FARM-53). Embedded: it is never read without its order. */
@Schema({ _id: false })
export class PriceProposalDocument {
  @Prop({ type: String, required: true, enum: ['buyer', 'farmer'] })
  proposedBy: 'buyer' | 'farmer';

  @Prop({ required: true, min: 0 })
  pricePerKg: number;

  @Prop({ required: false, trim: true })
  reason?: string;

  @Prop({ required: true })
  proposedAt: Date;
}

const PriceProposalSchema = SchemaFactory.createForClass(PriceProposalDocument);

/** Storage shape of an order in the `orders` collection. One line per order. */
@Schema({ collection: 'orders', timestamps: true })
export class OrderDocument {
  @Prop({ required: true, index: true })
  buyerId: string;

  @Prop({ required: true, index: true })
  farmerId: string;

  @Prop({ required: true, trim: true })
  farmerName: string;

  @Prop({ required: true, index: true })
  listingId: string;

  @Prop({ type: String, required: true, enum: CROP_IDS })
  cropId: CropId;

  @Prop({ required: true, min: 1 })
  quantityKg: number;

  /** Snapshot of the listing price at placement. */
  @Prop({ required: true, min: 0 })
  pricePerKg: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: false, trim: true })
  note?: string;

  @Prop({
    type: String,
    required: true,
    enum: orderStatusSchema.options,
    index: true,
  })
  status: OrderStatus;

  /** Set when a driver accepts the job (FARM-49/54). Indexed: a driver's own job list is the
   *  read that runs on every open of the Jobs tab. */
  @Prop({ required: false, index: true })
  assignedDriverId?: string;

  /** What the driver actually loaded at the gate (LP-50); may differ from `quantityKg`. */
  @Prop({ required: false, min: 1 })
  collectedKg?: number;

  /** When the buyer confirmed receipt (FARM-51). Absent until they do. */
  @Prop({ required: false })
  receivedAt?: Date;

  /** Absent unless a new price is waiting for an answer. */
  @Prop({ type: PriceProposalSchema, required: false })
  priceProposal?: PriceProposalDocument;

  createdAt: Date;
  updatedAt: Date;
}

export type OrderHydrated = HydratedDocument<OrderDocument>;

export const OrderSchema = SchemaFactory.createForClass(OrderDocument);

export const ORDER_MODEL = OrderDocument.name;
