import { rolesFor, type Action, type Role } from '@farm-pool/shared';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'farm-pool:roles';
export const PENDING_OK_KEY = 'farm-pool:pending-ok';

/**
 * Restrict a route to roles that may perform an `Action` from the shared permission matrix
 * (`PERMISSIONS` in `@farm-pool/shared`). Prefer this over `@Roles()`: the matrix is the one
 * table both the api and the app read, so a change there changes who gets a 403 *and* who sees
 * the button, together.
 *
 *   @Allow('users:list')
 *   @Get('users') listUsers() { ... }
 */
export const Allow = (action: Action) =>
  SetMetadata(ROLES_KEY, [...rolesFor(action)]);

/** Restrict a route to explicit roles. For the rare rule that is not an `Action` yet. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Exempts one `@Allow()`/`@Roles()` route from `RolesGuard`'s account-status check, so a
 * `pending_review` account can still call it (FARM-44) — today, only `cooperative:join`: a
 * farmer applying to a cooperative right after registering, while still pending, is the point.
 *
 * `@Allow()` only stores the resolved role list, not the action name, so the guard has no other
 * way to single out one action for this exception.
 *
 *   @Allow('cooperative:join')
 *   @AllowWhilePending()
 *   @Post('apply') apply() { ... }
 */
export const AllowWhilePending = () => SetMetadata(PENDING_OK_KEY, true);
