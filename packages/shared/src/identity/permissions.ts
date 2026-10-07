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
  "order:read-own",
  "order:cancel",
  "order:accept",
  "call:join",
  "call:request",
  "call:answer",
  "wanted:read",
  "wanted:create",
  "delivery:read-jobs",
  "delivery:accept",
  "delivery:confirm",
  "delivery:read-driver",
  "driver:update-vehicle",
  "users:list",
  "farmers:approve",
  "farmers:reject",
  "cooperative:read-dashboard",
  "cooperative:read-farmers",
  "cooperative:read-tasks",
  "cooperative:join",
  "benchmark:read",
  "benchmark:set"
]);

export type Action = z.infer<typeof actionSchema>;

export const PERMISSIONS: Readonly<Record<Action, readonly Role[]>> = {
  "profile:read-self": ROLES,
  "listing:read": ROLES,
  "listing:create": ["farmer"],
  "order:place": ["buyer"],
  // Any role may ask for an order; the use-case then checks the caller is its buyer or farmer.
  "order:read-own": ROLES,
  "order:cancel": ["buyer"],
  "order:accept": ["farmer"],
  // Any role may ask to join or end a call; the use-case then checks the caller is a participant.
  "call:join": ROLES,
  "call:request": ["buyer"],
  "call:answer": ["farmer"],
  // Farmers read requests to answer them later; coordinators see their region's demand.
  "wanted:read": ROLES,
  "wanted:create": ["buyer"],
  "delivery:read-jobs": ["logistics"],
  "delivery:accept": ["logistics"],
  // Pickup and drop-off. The use-case then checks the caller is the driver holding that job.
  "delivery:confirm": ["logistics"],
  /* Any role may ask who is driving an order; the use-case then checks the caller is its farmer,
     its buyer, or the driver themselves. A farmer seeing the plate before handing over produce is
     the point of verification (LP-04), so this cannot be logistics-only. */
  "delivery:read-driver": ROLES,
  // A driver's own vehicle, on their own account; the use-case writes only to the caller.
  "driver:update-vehicle": ["logistics"],
  // The coordinator is the trust checkpoint (`.plans/PRODUCT.md`); only they see everyone.
  "users:list": ["coordinator"],
  "farmers:approve": ["coordinator"],
  "farmers:reject": ["coordinator"],
  "cooperative:read-dashboard": ["coordinator"],
  "cooperative:read-farmers": ["coordinator"],
  "cooperative:read-tasks": ["coordinator"],
  // A still-pending farmer calling this right after registering (FARM-44) — reachable while
  // pending via `@AllowWhilePending()`, the one deliberate exception to the status gate below.
  "cooperative:join": ["farmer"],
  "benchmark:read": ["coordinator"],
  "benchmark:set": ["coordinator"]
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[action].includes(role);
}

export function rolesFor(action: Action): readonly Role[] {
  return PERMISSIONS[action];
}
