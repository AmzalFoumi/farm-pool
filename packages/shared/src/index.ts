/**
 * Types and zod schemas imported by both `mobile/` and `api/`.
 *
 * Define something here the moment a second workspace needs it — not before. A shared package with
 * one consumer is indirection for its own sake. See `.plans/STRUCTURE.md`.
 *
 * Deliberately minimal: the domain model waits on the persistence decision
 * (`.plans/DECISIONS.md`, open question 1). Roles are the one part already settled, because the
 * three-role split is what makes authentication a design question rather than a detail.
 *
 * UNTESTED ON THE BACKEND: this package ships raw TypeScript, which Metro compiles but `tsc` may
 * refuse (files outside `rootDir`). If `npm run build --workspace api` fails at your first import
 * here, do not patch api/tsconfig.json — give this package a `dist/` build step instead.
 * See `.plans/STRUCTURE.md` and the matching check in `.plans/VERIFY.md`.
 */
import { z } from "zod";

export const roleSchema = z.enum(["farmer", "buyer", "logistics"]);

export type Role = z.infer<typeof roleSchema>;
