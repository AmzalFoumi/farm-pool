import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { IdentityError, type IdentityErrorCode } from './application/errors';

/**
 * The one place an `IdentityError` code becomes an HTTP status. The use-cases throw codes;
 * this filter (registered as `APP_FILTER` in `identity.module.ts`) answers with
 * `{ code, message }`, the same body shape the guards and the validation pipe use.
 */
const STATUS: Record<IdentityErrorCode, HttpStatus> = {
  phone_taken: HttpStatus.CONFLICT,
  invalid_credentials: HttpStatus.UNAUTHORIZED,
  invalid_token: HttpStatus.UNAUTHORIZED,
  not_found: HttpStatus.NOT_FOUND,
};

@Catch(IdentityError)
export class IdentityErrorFilter implements ExceptionFilter<IdentityError> {
  catch(error: IdentityError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response
      .status(STATUS[error.code])
      .json({ code: error.code, message: error.message });
  }
}
