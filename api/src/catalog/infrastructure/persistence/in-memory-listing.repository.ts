import { randomUUID } from 'node:crypto';
import type { Listing, NewListing } from '../../domain/entities/listing';
import type {
  ListingFilter,
  ListingRepository,
} from '../../domain/repositories/listing.repository';

/** Map-backed `ListingRepository` for unit tests. Same ordering and filtering rules as Mongo. */
export class InMemoryListingRepository implements ListingRepository {
  private readonly rows = new Map<string, Listing & { seedKey?: string }>();

  findById(id: string): Promise<Listing | null> {
    const row = this.rows.get(id);
    return Promise.resolve(row ? snapshot(row) : null);
  }

  findVerified(filter: ListingFilter, limit: number): Promise<Listing[]> {
    const district = filter.district?.toLowerCase();
    const found = [...this.rows.values()]
      .filter((l) => l.status === 'verified')
      .filter((l) => !filter.crop || l.cropId === filter.crop)
      .filter((l) => !district || l.district.toLowerCase() === district)
      .filter((l) => !filter.farmerId || l.farmerId === filter.farmerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map(snapshot);
    return Promise.resolve(found);
  }

  findByFarmerId(farmerId: string): Promise<Listing[]> {
    const found = [...this.rows.values()]
      .filter((l) => l.farmerId === farmerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(snapshot);
    return Promise.resolve(found);
  }

  create(listing: NewListing): Promise<Listing> {
    const now = new Date();
    const row = {
      ...listing,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }

  upsertBySeedKey(seedKey: string, listing: NewListing): Promise<Listing> {
    const existing = [...this.rows.values()].find((l) => l.seedKey === seedKey);
    const now = new Date();
    const row = {
      ...listing,
      id: existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      seedKey,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }

  /** Test helper: add a listing directly, in any status. */
  seed(listing: NewListing, createdAt = new Date()): Promise<Listing> {
    const row = {
      ...listing,
      id: randomUUID(),
      createdAt,
      updatedAt: createdAt,
    };
    this.rows.set(row.id, row);
    return Promise.resolve(snapshot(row));
  }
}

function snapshot(row: Listing & { seedKey?: string }): Listing {
  return {
    id: row.id,
    farmerId: row.farmerId,
    farmerName: row.farmerName,
    cropId: row.cropId,
    quantityKg: row.quantityKg,
    pricePerKg: row.pricePerKg,
    harvestDate: row.harvestDate,
    district: row.district,
    minOrderKg: row.minOrderKg,
    status: row.status,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
