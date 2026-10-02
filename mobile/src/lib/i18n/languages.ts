/**
 * The three languages FarmPool ships in (LP-91).
 *
 * All four research interviews were conducted in Sinhala or Tamil, so these are not a
 * nice-to-have translation layer over an English product — English is the third audience.
 *
 * Each label is written **in its own script**: someone scanning for their language should not
 * have to read English to find it. That is also why the welcome screen shows all three at once
 * rather than behind a "Language" menu.
 */
export const LANGUAGES = [
  { code: "en", label: "English", endonym: "English" },
  { code: "si", label: "සිංහල", endonym: "Sinhala" },
  { code: "ta", label: "தமிழ்", endonym: "Tamil" }
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}
