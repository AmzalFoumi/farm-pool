import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import si from "./locales/si.json";
import ta from "./locales/ta.json";

export { LANGUAGES, isLanguageCode, type LanguageCode } from "./languages";

/**
 * Translation, set up once (LP-91).
 *
 * `i18next` rather than a hand-rolled `t()`: the app needs plurals ("1 job" / "2 jobs"),
 * interpolation ("Collect from {{name}}") and a sane fallback for a key a translator has not
 * reached yet. Those three are most of what a bespoke one grows into, and Sinhala and Tamil both
 * have plural rules that `Intl.PluralRules` already knows and nobody on the team should be
 * hand-encoding.
 *
 * **No language detector.** The device locale is deliberately not read: a shared or
 * second-hand phone in a rural household is routinely set to a language its current user does
 * not read, and silently picking Sinhala for a Tamil speaker is worse than asking. The welcome
 * screen asks once and `locale-provider.tsx` remembers the answer.
 *
 * `compatibilityJSON: "v4"` keeps plural suffixes on the Intl rules rather than i18next's old
 * ones, which matters for `si` and `ta` where the legacy tables were wrong.
 */
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, si: { translation: si }, ta: { translation: ta } },
  lng: "en",
  fallbackLng: "en",
  /* A missing Sinhala key falls through to English rather than printing the key. A driver
     reading one English line in an otherwise Sinhala screen can still act; `orders.job.take`
     on a button is a dead end. */
  returnEmptyString: false,
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4"
});

export default i18n;
