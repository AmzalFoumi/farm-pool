import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

/** Stable codes the app switches on. Public API: add, do not rename. */
export type CatalogErrorCode =
  | 'listing_not_found'
  | 'wanted_not_found'
  | 'not_your_request'
  | 'wanted_already_closed'
  | 'farmer_not_found';

export class CatalogError extends DomainError<CatalogErrorCode> {
  constructor(kind: DomainErrorKind, code: CatalogErrorCode, message: string) {
    super(kind, code, message);
    this.name = 'CatalogError';
  }
}
