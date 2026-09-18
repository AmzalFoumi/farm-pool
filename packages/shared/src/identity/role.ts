import { z } from "zod";

/**
 * The four personas. They are roles here, not backend modules — the `identity` domain in `api/`
 * owns them, and the other domains (catalog, orders, logistics, coordination) act on behalf of
 * whichever role is calling. See `.plans/STRUCTURE.md`.
 *
 * `logistics` is what the role picker labels "Delivery partner"; the internal name is the domain
 * name so a driver's account and the logistics module agree on one word.
 */
export const roleSchema = z.enum(["farmer", "buyer", "coordinator", "logistics"]);

export type Role = z.infer<typeof roleSchema>;

/** All roles, in a stable order — for iterating a permission matrix or seeding a picker. */
export const ROLES = roleSchema.options;

/**
 * Account lifecycle. Only `active` does anything today: the field is stored and returned so the
 * coordinator-approval gate for new farmers (`pending_review`) can be enforced later without a
 * migration. No guard checks it yet — see `.plans/auth/README.md`.
 */
export const accountStatusSchema = z.enum(["active", "pending_review", "suspended"]);

export type AccountStatus = z.infer<typeof accountStatusSchema>;
