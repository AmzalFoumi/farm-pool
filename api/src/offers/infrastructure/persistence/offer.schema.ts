import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, type HydratedDocument } from 'mongoose';
import { CROP_IDS, type CropId } from '@farm-pool/shared';

@Schema({ _id: false })
export class NegotiationEntryDocument {
  @Prop({ required: true, enum: ['FARMER', 'BUYER'] }) senderType: string;
  @Prop({ required: true }) proposedPrice: number;
  @Prop({ required: true }) proposedQuantityKg: number;
  @Prop() note?: string;
  @Prop({ default: Date.now }) timestamp: Date;
}
export const NegotiationEntrySchema = SchemaFactory.createForClass(
  NegotiationEntryDocument,
);

@Schema({ collection: 'offers', timestamps: true })
export class OfferDocument extends Document {
  @Prop({ required: true, index: true }) buyerId: string;
  @Prop({ required: true, index: true }) farmerId: string;
  @Prop({ required: true, index: true }) listingId: string;
  @Prop({ required: true, enum: ['STANDARD', 'WANTED'] }) listingType: string;
  @Prop({ type: String, required: true, enum: CROP_IDS }) cropId: CropId;
  @Prop({ required: true, enum: ['FARMER', 'BUYER'] }) initiatedBy: string;

  @Prop({ required: true }) pricePerKg: number;
  @Prop({ required: true }) quantityKg: number;
  @Prop({ required: true }) total: number;
  @Prop() note?: string;

  @Prop({
    required: true,
    enum: ['PENDING', 'NEGOTIATING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
    default: 'PENDING',
  })
  status: string;
  @Prop({ required: true, enum: ['FARMER', 'BUYER'] }) actionRequiredBy: string;

  @Prop({ type: [NegotiationEntrySchema], default: [] })
  negotiationHistory: NegotiationEntryDocument[];

  @Prop({ default: 0 }) version: number;
  @Prop({ type: String, required: false }) orderId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type OfferHydrated = HydratedDocument<OfferDocument>;

export const OfferSchema = SchemaFactory.createForClass(OfferDocument);

OfferSchema.index({ buyerId: 1, status: 1 });
OfferSchema.index({ farmerId: 1, status: 1 });
OfferSchema.index({ listingId: 1, status: 1 });

export const OFFER_MODEL = OfferDocument.name;
