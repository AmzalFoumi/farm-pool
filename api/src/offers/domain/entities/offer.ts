import type {
  NegotiationEntry,
  OfferStatus,
  SenderType,
  ListingType,
  CropId,
  Offer as OfferDto,
  DropOff,
} from '@farm-pool/shared';

export interface Offer {
  id: string;
  buyerId: string;
  farmerId: string;
  listingId: string;
  listingType: ListingType;
  /** The buyer's wanted request this offer answers (FARM-47). `listingId` is still a listing. */
  wantedId?: string;
  cropId: CropId;
  initiatedBy: SenderType;
  /** Snapshots taken at creation. Absent on offers stored before they existed. */
  farmerName?: string;
  buyerName?: string;
  pricePerKg: number;
  quantityKg: number;
  total: number;
  note?: string;
  /** Where the buyer wants it delivered; copied onto the order at acceptance. */
  dropOff?: DropOff;
  status: OfferStatus;
  actionRequiredBy: SenderType;
  negotiationHistory: NegotiationEntry[];
  version: number;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Which side of this offer a user is on, or `null` when they are on neither. */
export function sideOf(offer: Offer, userId: string): SenderType | null {
  if (userId === offer.farmerId) return 'FARMER';
  if (userId === offer.buyerId) return 'BUYER';
  return null;
}

export type NewOffer = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>;

export function toOfferDto(offer: Offer): OfferDto {
  return {
    id: offer.id,
    buyerId: offer.buyerId,
    farmerId: offer.farmerId,
    listingId: offer.listingId,
    listingType: offer.listingType,
    ...(offer.wantedId !== undefined ? { wantedId: offer.wantedId } : {}),
    cropId: offer.cropId,
    initiatedBy: offer.initiatedBy,
    ...(offer.farmerName !== undefined ? { farmerName: offer.farmerName } : {}),
    ...(offer.buyerName !== undefined ? { buyerName: offer.buyerName } : {}),
    pricePerKg: offer.pricePerKg,
    quantityKg: offer.quantityKg,
    total: offer.total,
    ...(offer.note !== undefined ? { note: offer.note } : {}),
    ...(offer.dropOff !== undefined ? { dropOff: offer.dropOff } : {}),
    status: offer.status,
    actionRequiredBy: offer.actionRequiredBy,
    negotiationHistory: offer.negotiationHistory,
    ...(offer.orderId !== undefined ? { orderId: offer.orderId } : {}),
    createdAt: offer.createdAt.toISOString(),
    updatedAt: offer.updatedAt.toISOString(),
  };
}
