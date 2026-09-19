import type { CreateListingData, Listing } from '@farm-pool/shared';
import { toListingDto } from '../../domain/entities/listing';
import type { ListingRepository } from '../../domain/repositories/listing.repository';

export class CreateListing {
  constructor(private readonly listings: ListingRepository) {}

  async execute(
    farmer: { id: string; name: string },
    data: CreateListingData,
  ): Promise<Listing> {
    const minOrderKg = data.minOrderKg ?? Math.min(data.quantityKg, 100);
    const created = await this.listings.create({
      farmerId: farmer.id,
      farmerName: farmer.name,
      ...data,
      minOrderKg,
      status: 'pending_approval',
    });
    return toListingDto(created);
  }
}
