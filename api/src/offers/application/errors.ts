import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

export type OfferErrorCode =
  'not_found' | 'conflict' | 'invalid' | 'not_your_offer';

export class OfferError extends DomainError<OfferErrorCode> {
  constructor(kind: DomainErrorKind, code: OfferErrorCode, message: string) {
    super(kind, code, message);
    this.name = 'OfferError';
  }
}
