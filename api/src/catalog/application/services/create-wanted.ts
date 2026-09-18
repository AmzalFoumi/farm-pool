import type { CreateWantedData, WantedListing } from '@farm-pool/shared';
import { toWantedListingDto } from '../../domain/entities/wanted-listing';
import type { WantedRepository } from '../../domain/repositories/wanted.repository';

/** A buyer posts a crop request. The buyer id comes from the token, never the body. */
export class CreateWanted {
  constructor(private readonly wanted: WantedRepository) {}

  async execute(
    buyerId: string,
    data: CreateWantedData,
  ): Promise<WantedListing> {
    const created = await this.wanted.create({
      buyerId,
      cropId: data.cropId,
      quantityKg: data.quantityKg,
      ...(data.maxPricePerKg !== undefined
        ? { maxPricePerKg: data.maxPricePerKg }
        : {}),
      neededBy: data.neededBy,
      district: data.district,
      ...(data.note ? { note: data.note } : {}),
    });
    return toWantedListingDto(created);
  }
}
