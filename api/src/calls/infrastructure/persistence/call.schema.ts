import { callStatusSchema } from '@farm-pool/shared';
import type { CallStatus } from '@farm-pool/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** Storage shape of a call in the `calls` collection. No media is stored: that stays on Agora. */
@Schema({ collection: 'calls', timestamps: true })
export class CallDocument {
  @Prop({ required: true, index: true })
  listingId: string;

  @Prop({ required: true, index: true })
  callerId: string;

  @Prop({ required: true, trim: true })
  callerName: string;

  @Prop({ required: true, index: true })
  calleeId: string;

  @Prop({ required: true, trim: true })
  calleeName: string;

  @Prop({
    type: String,
    required: true,
    enum: callStatusSchema.options,
    default: 'requested',
    index: true,
  })
  status: CallStatus;

  @Prop({ required: false })
  startedAt?: Date;

  @Prop({ required: false })
  endedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type CallHydrated = HydratedDocument<CallDocument>;

export const CallSchema = SchemaFactory.createForClass(CallDocument);

export const CALL_MODEL = CallDocument.name;
