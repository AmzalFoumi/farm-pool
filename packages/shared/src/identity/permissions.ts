import { z } from "zod";

import { ROLES, type Role } from "./role";

/**
 * Role-based access control, as data.
 *
 * One matrix, read by both sides: the api's `RolesGuard` answers "may this token call this
 * endpoint", and the app answers "should this button exist for this user" — from the same table,
 * so the two cannot disagree. Add an action here when a new endpoint or screen needs one; do not
 * hard-code a role name at a call site.
 *
 * The starting set covers what exists or is next. Actions are `<resource>:<verb>` so the list
 * reads as a table of what each role can do.
 */
export const actionSchema = z.enum([
  "profile:read-self",
  "listing:read",
  "listing:create",
  "order:place",
  "order:accept",
  "delivery:accept",
  "users:list",
  "farmers:approve"
]);

export type Action = z.infer<typeof actionSchema>;

export const PERMISSIONS: Readonly<Record<Action, readonly Role[]>> = {
  "profile:read-self": ROLES,
  "listing:read": ROLES,
  "listing:create": ["farmer"],
  "order:place": ["buyer"],
  "order:accept": ["farmer"],
  "delivery:accept": ["logistics"],
  // The coordinator is the trust checkpoint (`.plans/PRODUCT.md`); only they see everyone.
  "users:list": ["coordinator"],
  "farmers:approve": ["coordinator"]
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[action].includes(role);
}

export function rolesFor(action: Action): readonly Role[] {
  return PERMISSIONS[action];
}
