import { CROP_IDS, listingStatusSchema } from '@farm-pool/shared';
import type { CropId, ListingStatus } from '@farm-pool/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/**
 * Storage shape of a listing in the `listings` collection. The domain works with `Listing` from
 * `domain/entities/listing.ts`; the repository maps between the two.
 *
 * `seedKey` is set only by the dev seed so a re-run updates the same rows; real listings never
 * have one (sparse unique index, so its absence does not collide).
 */
@Schema({ collection: 'listings', timestamps: true })
export class ListingDocument {
  @Prop({ required: true, index: true })
  farmerId: string;

  @Prop({ required: true, trim: true })
  farmerName: string;

  @Prop({ type: String, required: true, enum: CROP_IDS, index: true })
  cropId: CropId;

  @Prop({ required: false })
  category?: string;

  @Prop({ required: true, min: 1 })
  quantityKg: number;

  @Prop({ required: false })
  unit?: string;

  @Prop({ required: false })
  variety?: string;

  @Prop({ required: false })
  grade?: string;

  @Prop({ required: false })
  packaging?: string;

  @Prop({ type: [String], required: false })
  certifications?: string[];

  @Prop({ required: true, min: 0 })
  pricePerKg: number;

  /** Calendar date `YYYY-MM-DD`, stored as text to avoid timezone drift. */
  @Prop({ required: true })
  harvestDate: string;

  @Prop({ required: false })
  expiryDays?: number;

  @Prop({ type: [String], required: false })
  photos?: string[];

  @Prop({ required: false })
  acceptNegotiation?: boolean;

  @Prop({ required: true, trim: true })
  district: string;

  @Prop({ required: false })
  town?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  fulfillmentOption?: string;

  @Prop({ required: false })
  farmgateNotes?: string;

  /** Lower-cased copy of `district` for a case-insensitive filter without a collation. */
  @Prop({ required: true, index: true })
  districtKey: string;

  @Prop({ required: true, min: 1 })
  minOrderKg: number;

  @Prop({
    type: String,
    required: true,
    enum: listingStatusSchema.options,
    index: true,
  })
  status: ListingStatus;

  @Prop({ required: false, unique: true, sparse: true })
  seedKey?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type ListingHydrated = HydratedDocument<ListingDocument>;

export const ListingSchema = SchemaFactory.createForClass(ListingDocument);

export const LISTING_MODEL = ListingDocument.name;
