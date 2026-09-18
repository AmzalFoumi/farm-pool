import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  Cooperative,
  NewCooperative,
} from '../../domain/entities/cooperative';
import type { CooperativeRepository } from '../../domain/repositories/cooperative.repository';
import {
  COOPERATIVE_MODEL,
  CooperativeDocument,
  type CooperativeHydrated,
} from './cooperative.schema';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class MongooseCooperativeRepository implements CooperativeRepository {
  constructor(
    @InjectModel(COOPERATIVE_MODEL)
    private readonly cooperatives: Model<CooperativeDocument>,
  ) {}

  async findById(id: string): Promise<Cooperative | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.cooperatives.findById(id).exec();
    return doc ? toCooperative(doc) : null;
  }

  async findByCoordinatorId(coordinatorId: string): Promise<Cooperative[]> {
    const docs = await this.cooperatives
      .find({ coordinatorId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(toCooperative);
  }

  async upsertBySeedKey(
    seedKey: string,
    cooperative: NewCooperative,
  ): Promise<Cooperative> {
    const doc = await this.cooperatives
      .findOneAndUpdate(
        { seedKey },
        { ...cooperative, seedKey },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();
    return toCooperative(doc);
  }
}

function toCooperative(doc: CooperativeHydrated): Cooperative {
  return {
    id: doc._id.toHexString(),
    coordinatorId: doc.coordinatorId,
    name: doc.name,
    district: doc.district,
    memberFarmerIds: doc.memberFarmerIds,
    createdAt: doc.createdAt,
  };
}
