import type { Role } from '@farm-pool/shared';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './authenticated-request';
import { ROLES_KEY } from './roles.decorator';

/**
 * "May this role call this route?" Runs after `JwtAuthGuard` (registration order in
 * `identity.module.ts`) and reads the roles `@Allow()` / `@Roles()` put on the handler or
 * the controller. A route with no such metadata is open to every signed-in role.
 *
 * 403 `{ code: 'forbidden' }` means "you are signed in, but this is not for your role" — the
 * app should not log the user out for it, unlike a 401.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) {
      // Only reachable if a role-restricted route is also @Public(), which is a wiring bug.
      throw new UnauthorizedException({
        code: 'unauthorized',
        message: 'Sign in to access this',
      });
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: `This is not available to the ${user.role} role`,
      });
    }
    return true;
  }
}
