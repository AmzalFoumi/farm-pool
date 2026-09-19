import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

/** Stable codes the app switches on. Public API: add, do not rename. */
export type CoordinationErrorCode = 'cooperative_not_found';

export class CoordinationError extends DomainError<CoordinationErrorCode> {
  constructor(
    kind: DomainErrorKind,
    code: CoordinationErrorCode,
    message: string,
  ) {
    super(kind, code, message);
    this.name = 'CoordinationError';
  }
}
