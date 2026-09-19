import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/**
 * Storage shape of a cooperative in the `cooperatives` collection. The domain works with
 * `Cooperative` from `domain/entities/cooperative.ts`; the repository maps between the two.
 *
 * `seedKey` is set only by a dev seed so a re-run updates the same rows; real cooperatives never
 * have one (sparse unique index, so its absence does not collide) — same pattern as `catalog`'s
 * `listing.schema.ts`.
 */
@Schema({ collection: 'cooperatives', timestamps: true })
export class CooperativeDocument {
  @Prop({ required: true, index: true })
  coordinatorId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  district: string;

  @Prop({ type: [String], required: true, default: [] })
  memberFarmerIds: string[];

  @Prop({ required: false, unique: true, sparse: true })
  seedKey?: string;

  createdAt: Date;
}

export type CooperativeHydrated = HydratedDocument<CooperativeDocument>;

export const CooperativeSchema =
  SchemaFactory.createForClass(CooperativeDocument);

export const COOPERATIVE_MODEL = CooperativeDocument.name;
