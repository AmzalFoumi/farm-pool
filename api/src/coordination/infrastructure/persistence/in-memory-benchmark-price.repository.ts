import { randomUUID } from 'node:crypto';
import type { CropId } from '@farm-pool/shared';
import type {
  BenchmarkPrice,
  NewBenchmarkPrice,
} from '../../domain/entities/benchmark-price';
import type { BenchmarkPriceRepository } from '../../domain/repositories/benchmark-price.repository';

/** Map-backed `BenchmarkPriceRepository` for unit tests. Same rules as the Mongoose one — every
 *  `create` is a new row, nothing is ever overwritten. */
export class InMemoryBenchmarkPriceRepository implements BenchmarkPriceRepository {
  private readonly rows: BenchmarkPrice[] = [];

  findCurrentByDistrict(district: string): Promise<BenchmarkPrice[]> {
    const seen = new Set<CropId>();
    const current: BenchmarkPrice[] = [];
    for (const row of newestFirst(
      this.rows.filter((r) => r.district === district),
    )) {
      if (seen.has(row.cropId)) continue;
      seen.add(row.cropId);
      current.push(snapshot(row));
    }
    return Promise.resolve(current);
  }

  findCurrentByCropAndDistrict(
    cropId: CropId,
    district: string,
  ): Promise<BenchmarkPrice | null> {
    const [row] = newestFirst(
      this.rows.filter((r) => r.cropId === cropId && r.district === district),
    );
    return Promise.resolve(row ? snapshot(row) : null);
  }

  findHistoryByCropAndDistrict(
    cropId: CropId,
    district: string,
    limit: number,
  ): Promise<BenchmarkPrice[]> {
    const rows = newestFirst(
      this.rows.filter((r) => r.cropId === cropId && r.district === district),
    ).slice(0, limit);
    return Promise.resolve(rows.map(snapshot));
  }

  create(price: NewBenchmarkPrice): Promise<BenchmarkPrice> {
    return this.seed(price);
  }

  /** Test helper: add a row with a chosen `publishedAt`, to set up staleness scenarios `create`
   *  cannot (it always stamps "now", same as the Mongoose repository). */
  seed(
    price: NewBenchmarkPrice,
    publishedAt = new Date(),
  ): Promise<BenchmarkPrice> {
    const row: BenchmarkPrice = { ...price, id: randomUUID(), publishedAt };
    this.rows.push(row);
    return Promise.resolve(snapshot(row));
  }
}

function newestFirst(rows: BenchmarkPrice[]): BenchmarkPrice[] {
  return [...rows].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}

function snapshot(row: BenchmarkPrice): BenchmarkPrice {
  return { ...row, publishedAt: new Date(row.publishedAt) };
}
