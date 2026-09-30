import {
  DomainError,
  type DomainErrorKind,
} from '../../shared/kernel/domain-error';

/** Stable codes the app switches on. Public API: add, do not rename. */
export type LogisticsErrorCode =
  | 'job_not_found'
  | 'job_taken'
  | 'not_your_job'
  | 'no_vehicle'
  | 'load_too_heavy'
  | 'no_driver_assigned';

export class LogisticsError extends DomainError<LogisticsErrorCode> {
  constructor(
    kind: DomainErrorKind,
    code: LogisticsErrorCode,
    message: string,
  ) {
    super(kind, code, message);
    this.name = 'LogisticsError';
  }
}
