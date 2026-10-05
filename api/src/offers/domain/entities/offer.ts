import type {
  NegotiationEntry,
  OfferStatus,
  SenderType,
  ListingType,
  CropId,
  Offer as OfferDto,
} from '@farm-pool/shared';

export interface Offer {
  id: string;
  buyerId: string;
  farmerId: string;
  listingId: string;
  listingType: ListingType;
  cropId: CropId;
  initiatedBy: SenderType;
  pricePerKg: number;
  quantityKg: number;
  total: number;
  note?: string;
  status: OfferStatus;
  actionRequiredBy: SenderType;
  negotiationHistory: NegotiationEntry[];
  version: number;
  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewOffer = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>;

export function toOfferDto(offer: Offer): OfferDto {
  return {
    id: offer.id,
    buyerId: offer.buyerId,
    farmerId: offer.farmerId,
    listingId: offer.listingId,
    listingType: offer.listingType,
    cropId: offer.cropId,
    initiatedBy: offer.initiatedBy,
    pricePerKg: offer.pricePerKg,
    quantityKg: offer.quantityKg,
    total: offer.total,
    ...(offer.note !== undefined ? { note: offer.note } : {}),
    status: offer.status,
    actionRequiredBy: offer.actionRequiredBy,
    negotiationHistory: offer.negotiationHistory,
    ...(offer.orderId !== undefined ? { orderId: offer.orderId } : {}),
    createdAt: offer.createdAt.toISOString(),
    updatedAt: offer.updatedAt.toISOString(),
  };
}
