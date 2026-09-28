import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Call, CallChanges, NewCall } from '../../domain/entities/call';
import type { CallRepository } from '../../domain/repositories/call.repository';
import { CALL_MODEL, CallDocument, type CallHydrated } from './call.schema';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class MongooseCallRepository implements CallRepository {
  constructor(
    @InjectModel(CALL_MODEL) private readonly calls: Model<CallDocument>,
  ) {}

  async create(call: NewCall): Promise<Call> {
    const doc = await this.calls.create({ ...call, status: 'requested' });
    return toCall(doc);
  }

  async findById(id: string): Promise<Call | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.calls.findById(id).exec();
    return doc ? toCall(doc) : null;
  }

  async update(id: string, changes: CallChanges): Promise<Call> {
    const doc = await this.calls
      .findByIdAndUpdate(id, changes, { returnDocument: 'after' })
      .exec();
    if (!doc) throw new Error(`Call ${id} vanished during update`);
    return toCall(doc);
  }
}

function toCall(doc: CallHydrated): Call {
  return {
    id: doc._id.toHexString(),
    listingId: doc.listingId,
    callerId: doc.callerId,
    callerName: doc.callerName,
    calleeId: doc.calleeId,
    calleeName: doc.calleeName,
    status: doc.status,
    ...(doc.startedAt ? { startedAt: doc.startedAt } : {}),
    ...(doc.endedAt ? { endedAt: doc.endedAt } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
