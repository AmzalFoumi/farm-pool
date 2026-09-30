import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

/** Stable codes the app switches on. Public API: add, do not rename. */
export type CallErrorCode =
  | 'call_not_found'
  | 'not_your_call'
  | 'call_not_active'
  | 'calls_not_configured'
  | 'listing_not_found'
  | 'listing_unavailable'
  | 'own_listing'
  | 'call_already_open'
  | 'not_the_callee'
  | 'call_not_requested';

export class CallError extends DomainError<CallErrorCode> {
  constructor(kind: DomainErrorKind, code: CallErrorCode, message: string) {
    super(kind, code, message);
    this.name = 'CallError';
  }
}
