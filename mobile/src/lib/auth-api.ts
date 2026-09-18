import {
  authResponseSchema,
  publicUserSchema,
  type AuthResponse,
  type LoginInput,
  type PublicUser,
  type RegisterInput
} from "@farm-pool/shared";

import { apiFetch } from "@/lib/api";

/**
 * The identity endpoints, typed end to end from `@farm-pool/shared`. The request types are the
 * *input* side of the schemas (phone as typed); the api normalises. Screens should still run
 * `registerSchema.safeParse` first so a typo is caught before a round trip.
 */
export const authApi = {
  register(input: RegisterInput): Promise<AuthResponse> {
    return apiFetch("/identity/register", {
      method: "POST",
      body: input,
      schema: authResponseSchema
    });
  },

  login(input: LoginInput): Promise<AuthResponse> {
    return apiFetch("/identity/login", {
      method: "POST",
      body: input,
      schema: authResponseSchema
    });
  },

  me(token: string): Promise<PublicUser> {
    return apiFetch("/identity/me", { token, schema: publicUserSchema });
  }
};
