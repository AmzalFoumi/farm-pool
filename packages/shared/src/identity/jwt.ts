import { z } from "zod";

import { roleSchema } from "./role";

/**
 * The claims inside the access token. Kept to the minimum a guard needs: who (`sub`, the user id)
 * and what they may do (`role`). Everything else is looked up when it matters.
 *
 * The role is baked into the token, so a role or status change is not seen until the user logs in
 * again. Accepted for now (single 30-day token, no refresh) — the trade-off and the upgrade paths
 * are recorded in `.plans/auth/README.md`.
 *
 * The api validates decoded claims against this after verifying the signature. The app only uses
 * the type; it never decodes tokens.
 */
export const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  role: roleSchema,
  iat: z.number().int(),
  exp: z.number().int()
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
