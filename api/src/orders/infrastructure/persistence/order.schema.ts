import { CROP_IDS, orderStatusSchema } from '@farm-pool/shared';
import type { CropId, OrderStatus } from '@farm-pool/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

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

  createdAt: Date;
  updatedAt: Date;
}

export type OrderHydrated = HydratedDocument<OrderDocument>;

export const OrderSchema = SchemaFactory.createForClass(OrderDocument);

export const ORDER_MODEL = OrderDocument.name;
