import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

/** Stable codes the app switches on. Public API: add, do not rename. */
export type OrderErrorCode =
  | 'listing_not_found'
  | 'listing_unavailable'
  | 'quantity_out_of_range'
  | 'order_not_found'
  | 'not_your_order'
  | 'order_not_cancellable';

export class OrderError extends DomainError<OrderErrorCode> {
  constructor(kind: DomainErrorKind, code: OrderErrorCode, message: string) {
    super(kind, code, message);
    this.name = 'OrderError';
  }
}
