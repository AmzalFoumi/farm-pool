import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

export type OfferErrorCode =
  | 'not_found'
  | 'conflict'
  | 'invalid'
  | 'not_your_offer'
  | 'wanted_offers_unavailable'
  | 'listing_unavailable'
  | 'negotiation_not_accepted'
  | 'quantity_out_of_range'
  | 'offer_exists'
  | 'insufficient_stock';

export class OfferError extends DomainError<OfferErrorCode> {
  constructor(kind: DomainErrorKind, code: OfferErrorCode, message: string) {
    super(kind, code, message);
    this.name = 'OfferError';
  }
}
