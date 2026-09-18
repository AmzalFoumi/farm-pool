import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validate a request body with a zod schema from `@farm-pool/shared` and hand the handler the
 * *parsed* value (so a phone arrives normalised, a name trimmed).
 *
 *   @Post('register')
 *   register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterData) { ... }
 *
 * On failure: 400 with `{ code: 'validation_error', issues: [{ path, message }] }`. The
 * messages are the ones written in the shared schema, so the api says exactly what the form
 * would have said had it validated first — and the app can show them inline by `path`.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new BadRequestException({
      code: 'validation_error',
      message: 'Some fields are not valid',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    });
  }
}
