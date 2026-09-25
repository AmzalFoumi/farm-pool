import type {
  CropId,
  FulfillmentOption,
  Listing as ListingDto,
  ListingGrade,
  ListingPackaging,
  ListingStatus,
  ListingUnit,
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
  unit?: ListingUnit;
  variety?: string;
  grade?: ListingGrade;
  packaging?: ListingPackaging;
  certifications?: string[];
  pricePerKg: number;
  harvestDate: string;
  expiryDays?: number;
  photos?: string[];
  acceptNegotiation?: boolean;
  district: string;
  town?: string;
  address?: string;
  fulfillmentOption?: FulfillmentOption;
  farmgateNotes?: string;
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
    unit: listing.unit,
    variety: listing.variety,
    grade: listing.grade,
    packaging: listing.packaging,
    certifications: listing.certifications,
    pricePerKg: listing.pricePerKg,
    harvestDate: listing.harvestDate,
    expiryDays: listing.expiryDays,
    photos: listing.photos,
    acceptNegotiation: listing.acceptNegotiation,
    district: listing.district,
    town: listing.town,
    address: listing.address,
    fulfillmentOption: listing.fulfillmentOption,
    farmgateNotes: listing.farmgateNotes,
    minOrderKg: listing.minOrderKg,
    status: listing.status,
    createdAt: listing.createdAt.toISOString(),
  };
}
