import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CropId } from '@farm-pool/shared';
import type {
  BenchmarkPrice,
  NewBenchmarkPrice,
} from '../../domain/entities/benchmark-price';
import type { BenchmarkPriceRepository } from '../../domain/repositories/benchmark-price.repository';
import {
  BENCHMARK_PRICE_MODEL,
  BenchmarkPriceDocument,
  type BenchmarkPriceHydrated,
} from './benchmark-price.schema';

@Injectable()
export class MongooseBenchmarkPriceRepository implements BenchmarkPriceRepository {
  constructor(
    @InjectModel(BENCHMARK_PRICE_MODEL)
    private readonly prices: Model<BenchmarkPriceDocument>,
  ) {}

  async findCurrentByDistrict(district: string): Promise<BenchmarkPrice[]> {
    const docs = await this.prices
      .find({ district })
      .sort({ publishedAt: -1 })
      .exec();
    const seen = new Set<CropId>();
    const current: BenchmarkPrice[] = [];
    for (const doc of docs) {
      if (seen.has(doc.cropId)) continue;
      seen.add(doc.cropId);
      current.push(toBenchmarkPrice(doc));
    }
    return current;
  }

  async findCurrentByCropAndDistrict(
    cropId: CropId,
    district: string,
  ): Promise<BenchmarkPrice | null> {
    const doc = await this.prices
      .findOne({ cropId, district })
      .sort({ publishedAt: -1 })
      .exec();
    return doc ? toBenchmarkPrice(doc) : null;
  }

  async findHistoryByCropAndDistrict(
    cropId: CropId,
    district: string,
    limit: number,
  ): Promise<BenchmarkPrice[]> {
    const docs = await this.prices
      .find({ cropId, district })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();
    return docs.map(toBenchmarkPrice);
  }

  async create(price: NewBenchmarkPrice): Promise<BenchmarkPrice> {
    const doc = await this.prices.create({ ...price, publishedAt: new Date() });
    return toBenchmarkPrice(doc);
  }
}

function toBenchmarkPrice(doc: BenchmarkPriceHydrated): BenchmarkPrice {
  return {
    id: doc._id.toHexString(),
    cropId: doc.cropId,
    district: doc.district,
    lowPricePerKg: doc.lowPricePerKg,
    highPricePerKg: doc.highPricePerKg,
    source: doc.source,
    setByCoordinatorId: doc.setByCoordinatorId,
    publishedAt: doc.publishedAt,
  };
}
