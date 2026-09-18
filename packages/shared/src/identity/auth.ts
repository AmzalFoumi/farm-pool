import { z } from "zod";

import { phoneSchema } from "./phone";
import { accountStatusSchema, roleSchema } from "./role";

/**
 * Request and response shapes for registration and login. The mobile forms and the api validate
 * against these same objects, so a rule changed here changes on both sides at once.
 *
 * CREDENTIAL: phone + password. No OTP, no phone or email verification yet — decided 18 Sep 2026,
 * see `.plans/DECISIONS.md`. Email is reserved as a *later* credential: `publicUserSchema` already
 * carries an optional `email`, and `loginSchema` takes an `identifier` rather than a `phone` so
 * the email branch can be switched on without changing the request shape.
 */

/** A coordinator is assigned, not self-selected — the role picker never offers it, and the api
 *  refuses it on the public register endpoint. Coordinators are created by the seed script. */
export const selfRegisterRoleSchema = roleSchema.exclude(["coordinator"]);

export type SelfRegisterRole = z.infer<typeof selfRegisterRoleSchema>;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name")
  .max(60, "That name is too long");

/** Minimum 8 is the floor, not a strength policy: the audience types on shared, low-end devices
 *  and a longer rule mostly produces written-down passwords. */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "That password is too long");

export const registerSchema = z.object({
  displayName: displayNameSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: selfRegisterRoleSchema
});

/** What a form holds (phone as typed). */
export type RegisterInput = z.input<typeof registerSchema>;
/** What the api receives after parsing (phone normalised to E.164). */
export type RegisterData = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  /** Today: a phone number in any accepted spelling. Later: a phone number or an email. */
  identifier: z.string().trim().min(1, "Enter your phone number"),
  password: z.string().min(1, "Enter your password")
});

export type LoginInput = z.infer<typeof loginSchema>;

/** The user as anyone may see them — never the password hash. */
export const publicUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  phone: z.string(),
  email: z.email().optional(),
  role: roleSchema,
  status: accountStatusSchema,
  createdAt: z.iso.datetime()
});

export type PublicUser = z.infer<typeof publicUserSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: publicUserSchema
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
