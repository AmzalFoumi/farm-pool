import { z } from "zod";

/**
 * Canonical form for a Sri Lankan number: E.164, `+94` followed by nine digits.
 *
 * People type numbers the way they say them — `077 123 4567`, `0771234567`, `+94 77 123 4567`,
 * `94771234567` — and the account must be the same one whichever way it was typed, because the
 * phone number *is* the account identifier (one account per number). So every entry point
 * normalises before it compares or stores.
 *
 * Returns `null` when the input is not recognisably a Sri Lankan number; the caller decides
 * whether that is a validation error (a form) or a "try the other credential" branch (login).
 */
export function normalizeSriLankanPhone(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, "");

  const match =
    /^\+94(\d{9})$/.exec(compact) ??
    /^0094(\d{9})$/.exec(compact) ??
    /^94(\d{9})$/.exec(compact) ??
    /^0(\d{9})$/.exec(compact);

  return match ? `+94${match[1]}` : null;
}

/**
 * Accepts any of the spellings above and *outputs* the E.164 form. Note the input and output
 * types differ: use `z.input<>` for what a form holds and `z.output<>` for what the api stores.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeSriLankanPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a Sri Lankan phone number, for example 077 123 4567"
      });
      return z.NEVER;
    }
    return normalized;
  });
