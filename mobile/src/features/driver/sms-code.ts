import * as Crypto from "expo-crypto";

/**
 * THE SMS CODE IS NOT REAL YET. This file is the whole of the pretence, and the whole of what
 * has to be deleted when it becomes real.
 *
 * WHY IT EXISTS: the sign-up design (Figma 196:6238 / 196:6269) verifies a driver by SMS and
 * never asks for a password. The api does the opposite — `POST /identity/register` requires one
 * and there is no code endpoint, no `codes` collection and no SMS gateway
 * (`.plans/auth/README.md`). Sending a real SMS in Sri Lanka also needs a paid gateway and
 * credentials nobody has provisioned. So the screens are built against this stub and the flow is
 * demoable end to end today.
 *
 * WHAT IS FAKE, PRECISELY:
 * - `requestCode` sends nothing. It resolves after a short delay so the button's pending state
 *   is exercised.
 * - `verifyCode` accepts ANY six digits. It does not check a code, because none was issued.
 *
 * WHAT IS REAL: everything else. The account really is created through `POST /identity/register`
 * and the vehicle really is saved through `PUT /identity/me/vehicle`.
 *
 * REPLACING IT: add `POST /identity/code/request` and `/identity/code/verify` to the identity
 * domain, make `password` optional on `registerSchema`, and swap the two functions below for
 * `apiFetch` calls. Nothing outside this file and `driver-signup-screen.tsx` should need to
 * change — the screen already treats both as async and already renders their failures.
 */

/** Pretend to send. Resolves when a real gateway would have accepted the request. */
export async function requestCode(phone: string): Promise<void> {
  if (__DEV__) console.log(`[sms-code] pretending to send a code to ${phone}`);
  await new Promise((resolve) => setTimeout(resolve, 600));
}

/** Accepts any six digits. Returns false only for something that is not a six-digit code, so the
 *  field's own error path is exercised rather than being dead code. */
export async function verifyCode(_phone: string, code: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return /^\d{6}$/.test(code);
}

/**
 * The password the driver never sees.
 *
 * The design has no password field, but `registerSchema` requires one, so sign-up mints a strong
 * random one and the session token from `signUp` keeps the driver signed in. It is generated
 * with `expo-crypto`'s CSPRNG rather than `Math.random`, because it is a real credential on a
 * real account even though nobody types it.
 *
 * THE CONSEQUENCE, WHICH IS A REAL GAP: a driver who signs out, or whose token is cleared,
 * cannot log back in — they have no password and there is no code-based login. That is fixed by
 * the same work that makes the code real, and until then this flow is one-way.
 */
export function generatePassword(): string {
  const bytes = Crypto.getRandomBytes(24);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
