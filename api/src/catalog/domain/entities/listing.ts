import type {
  CropId,
  Listing as ListingDto,
  ListingStatus,
} from '@farm-pool/shared';

/**
 * A farmer's produce listing, as the domain sees it.
 *
 * `farmerName` is copied from the account at creation so a browse page is one query. If a farmer
 * renames themselves the old name stays on old listings — acceptable for now, noted in the README.
 * `harvestDate` is a calendar date (`YYYY-MM-DD`), kept as a string on purpose: a `Date` would
 * shift by a day between Sri Lanka and UTC.
 */
export interface Listing {
  id: string;
  farmerId: string;
  farmerName: string;
  cropId: CropId;
  quantityKg: number;
  pricePerKg: number;
  harvestDate: string;
  district: string;
  minOrderKg: number;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** What is needed to create one. The store assigns `id` and the timestamps. */
export type NewListing = Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>;

export function toListingDto(listing: Listing): ListingDto {
  return {
    id: listing.id,
    farmerId: listing.farmerId,
    farmerName: listing.farmerName,
    cropId: listing.cropId,
    quantityKg: listing.quantityKg,
    pricePerKg: listing.pricePerKg,
    harvestDate: listing.harvestDate,
    district: listing.district,
    minOrderKg: listing.minOrderKg,
    status: listing.status,
    createdAt: listing.createdAt.toISOString(),
  };
}
