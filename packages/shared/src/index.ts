/**
 * Types and zod schemas imported by both `mobile/` and `api/`.
 *
 * Define something here the moment a second workspace needs it — not before. A shared package with
 * one consumer is indirection for its own sake. See `.plans/STRUCTURE.md`.
 *
 * Deliberately minimal: the domain model waits on the persistence decision
 * (`.plans/DECISIONS.md`, open question 1). Roles are the one part already settled, because the
 * three-role split is what makes authentication a design question rather than a detail.
 */
import { z } from "zod";

export const roleSchema = z.enum(["farmer", "buyer", "logistics"]);

export type Role = z.infer<typeof roleSchema>;
