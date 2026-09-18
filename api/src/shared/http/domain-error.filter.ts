import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, type DomainErrorKind } from '../kernel/domain-error';

/**
 * Where a `DomainError` becomes an HTTP answer: `{ code, message }` with the status its kind
 * implies — the same body shape the guards, the validation pipe and `IdentityErrorFilter` use, so
 * the app has one error contract (`apiErrorSchema` in `packages/shared`).
 *
 * Registered once as `APP_FILTER` in `app.module.ts`; every domain module that throws
 * `DomainError` is covered without registering anything itself.
 */
const STATUS: Record<DomainErrorKind, HttpStatus> = {
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  conflict: HttpStatus.CONFLICT,
  invalid: HttpStatus.BAD_REQUEST,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .status(STATUS[error.kind])
      .json({ code: error.code, message: error.message });
  }
}
