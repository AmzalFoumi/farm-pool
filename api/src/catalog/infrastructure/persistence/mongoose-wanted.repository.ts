import type { WantedStatus } from '@farm-pool/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type {
  NewWantedListing,
  WantedListing,
} from '../../domain/entities/wanted-listing';
import type { WantedRepository } from '../../domain/repositories/wanted.repository';
import {
  WANTED_MODEL,
  WantedDocument,
  type WantedHydrated,
} from './wanted.schema';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

@Injectable()
export class MongooseWantedRepository implements WantedRepository {
  constructor(
    @InjectModel(WANTED_MODEL) private readonly wanted: Model<WantedDocument>,
  ) {}

  async create(input: NewWantedListing): Promise<WantedListing> {
    const doc = await this.wanted.create(input);
    return toWanted(doc);
  }

  async findById(id: string): Promise<WantedListing | null> {
    if (!OBJECT_ID.test(id)) return null;
    const doc = await this.wanted.findById(id).exec();
    return doc ? toWanted(doc) : null;
  }

  async findByBuyer(buyerId: string): Promise<WantedListing[]> {
    const docs = await this.wanted
      .find({ buyerId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map(toWanted);
  }

  async findByStatus(
    status: WantedStatus,
    limit: number,
  ): Promise<WantedListing[]> {
    const docs = await this.wanted
      .find({ status })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
    return docs.map(toWanted);
  }

  async updateStatus(id: string, status: WantedStatus): Promise<WantedListing> {
    const doc = await this.wanted
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();
    if (!doc) throw new Error(`Wanted listing ${id} vanished during update`);
    return toWanted(doc);
  }
}

function toWanted(doc: WantedHydrated): WantedListing {
  return {
    id: doc._id.toHexString(),
    buyerId: doc.buyerId,
    cropId: doc.cropId,
    quantityKg: doc.quantityKg,
    ...(typeof doc.maxPricePerKg === 'number'
      ? { maxPricePerKg: doc.maxPricePerKg }
      : {}),
    neededBy: doc.neededBy,
    district: doc.district,
    ...(typeof doc.note === 'string' ? { note: doc.note } : {}),
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
