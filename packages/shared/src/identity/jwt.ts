import { z } from "zod";

import { accountStatusSchema, roleSchema } from "./role";

/**
 * The claims inside the access token. Kept to the minimum a guard needs: who (`sub`, the user id)
 * and what they may do (`role`, `status`). Everything else is looked up when it matters.
 *
 * The role and status are baked into the token, so a role or status change is not seen until the
 * user logs in again. Accepted for now (single 30-day token, no refresh) — the trade-off and the
 * upgrade paths are recorded in `.plans/auth/README.md`. `status` lets `RolesGuard` refuse a
 * `pending_review`/`suspended` account on any role-restricted route (FARM-44) without a database
 * lookup per request.
 *
 * The api validates decoded claims against this after verifying the signature. The app only uses
 * the type; it never decodes tokens.
 */
export const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  role: roleSchema,
  status: accountStatusSchema,
  iat: z.number().int(),
  exp: z.number().int()
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
