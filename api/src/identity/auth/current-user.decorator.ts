import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authenticated-request';

/**
 * Hands a handler the verified token claims: `me(@CurrentUser() user: AuthenticatedUser)`.
 * Only meaningful on a route the `JwtAuthGuard` ran on, i.e. any route without `@Public()`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error(
        '@CurrentUser() used on a route the JwtAuthGuard did not run on',
      );
    }
    return request.user;
  },
);
