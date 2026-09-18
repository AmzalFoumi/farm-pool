import type {
  CropId,
  WantedListing as WantedListingDto,
  WantedStatus,
} from '@farm-pool/shared';

/** A buyer's crop request: "I want N kg of X by this date in this district". */
export interface WantedListing {
  id: string;
  buyerId: string;
  cropId: CropId;
  quantityKg: number;
  maxPricePerKg?: number;
  /** Calendar date, `YYYY-MM-DD`. */
  neededBy: string;
  district: string;
  note?: string;
  status: WantedStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type NewWantedListing = Omit<
  WantedListing,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export function toWantedListingDto(wanted: WantedListing): WantedListingDto {
  return {
    id: wanted.id,
    buyerId: wanted.buyerId,
    cropId: wanted.cropId,
    quantityKg: wanted.quantityKg,
    ...(wanted.maxPricePerKg !== undefined
      ? { maxPricePerKg: wanted.maxPricePerKg }
      : {}),
    neededBy: wanted.neededBy,
    district: wanted.district,
    ...(wanted.note !== undefined ? { note: wanted.note } : {}),
    status: wanted.status,
    createdAt: wanted.createdAt.toISOString(),
  };
}
