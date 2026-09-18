import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TOKEN_SIGNER,
  type TokenSigner,
} from '../application/ports/token-signer';
import type { AuthenticatedRequest } from './authenticated-request';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * "Is there a valid token?" Registered globally (`APP_GUARD` in `identity.module.ts`), so it
 * runs on every route; `@Public()` opts a route out.
 *
 * On success the verified claims are attached as `request.user` for `RolesGuard` and
 * `@CurrentUser()`. On failure the response is a 401 with `{ code: 'unauthorized' }` — the app
 * treats that as "session is gone, go back to Welcome".
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SIGNER) private readonly tokens: TokenSigner,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Missing bearer token',
      });
    }

    try {
      request.user = await this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Invalid or expired token',
      });
    }
    return true;
  }
}

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value || rest.length > 0) {
    return null;
  }
  return value;
}
