import { CROP_IDS, wantedStatusSchema } from '@farm-pool/shared';
import type { CropId, WantedStatus } from '@farm-pool/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** Storage shape of a buyer's crop request in the `wanted_listings` collection. */
@Schema({ collection: 'wanted_listings', timestamps: true })
export class WantedDocument {
  @Prop({ required: true, index: true })
  buyerId: string;

  @Prop({ type: String, required: true, enum: CROP_IDS })
  cropId: CropId;

  @Prop({ required: true, min: 1 })
  quantityKg: number;

  @Prop({ required: false, min: 0 })
  maxPricePerKg?: number;

  /** Calendar date `YYYY-MM-DD`. */
  @Prop({ required: true })
  neededBy: string;

  @Prop({ required: true, trim: true })
  district: string;

  @Prop({ required: false, trim: true })
  note?: string;

  @Prop({
    type: String,
    required: true,
    enum: wantedStatusSchema.options,
    default: 'open',
    index: true,
  })
  status: WantedStatus;

  createdAt: Date;
  updatedAt: Date;
}

export type WantedHydrated = HydratedDocument<WantedDocument>;

export const WantedSchema = SchemaFactory.createForClass(WantedDocument);

export const WANTED_MODEL = WantedDocument.name;
