import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

/** Stable codes the app switches on. Public API: add, do not rename. */
export type PaymentErrorCode =
  | 'order_not_found'
  | 'not_your_order'
  | 'order_not_payable'
  | 'already_paid'
  | 'payment_not_found'
  | 'not_delivered_yet'
  | 'already_released';

export class PaymentError extends DomainError<PaymentErrorCode> {
  constructor(kind: DomainErrorKind, code: PaymentErrorCode, message: string) {
    super(kind, code, message);
    this.name = 'PaymentError';
  }
}
