import { rolesFor, type Action, type Role } from '@farm-pool/shared';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'farm-pool:roles';

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
