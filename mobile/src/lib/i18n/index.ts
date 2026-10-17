import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import enBuyer from "./locales/en/buyer.json";
import enCommon from "./locales/en/common.json";
import enCoordinator from "./locales/en/coordinator.json";
import enDriver from "./locales/en/driver.json";
import enFarmer from "./locales/en/farmer.json";
import enGeo from "./locales/en/geo.json";
import enLogistics from "./locales/en/logistics.json";
import enOnboarding from "./locales/en/onboarding.json";
import siBuyer from "./locales/si/buyer.json";
import siCommon from "./locales/si/common.json";
import siCoordinator from "./locales/si/coordinator.json";
import siDriver from "./locales/si/driver.json";
import siFarmer from "./locales/si/farmer.json";
import siGeo from "./locales/si/geo.json";
import siLogistics from "./locales/si/logistics.json";
import siOnboarding from "./locales/si/onboarding.json";
import taBuyer from "./locales/ta/buyer.json";
import taCommon from "./locales/ta/common.json";
import taCoordinator from "./locales/ta/coordinator.json";
import taDriver from "./locales/ta/driver.json";
import taFarmer from "./locales/ta/farmer.json";
import taGeo from "./locales/ta/geo.json";
import taLogistics from "./locales/ta/logistics.json";
import taOnboarding from "./locales/ta/onboarding.json";

export { LANGUAGES, isLanguageCode, type LanguageCode } from "./languages";

/**
 * One language's strings, assembled from the per-area files in `locales/<lang>/`.
 *
 * **Why the files are split.** A single `en.json` put every member's strings in one place, and
 * two branches adding keys to it conflicted every time — the keys land at the same point, at the
 * end of the same object, so git cannot merge them. Splitting by area means the driver work and
 * the listing work touch different files and merge cleanly. The *keys are unchanged*: these are
 * spread into one flat resource, so `t("jobs.title")` still resolves exactly as before and no
 * screen needs a namespace prefix.
 *
 * `buyer`, `farmer` and `coordinator` are empty on purpose. They are the homes for screens that
 * are still hard-coded English, so the first person to localise one does not have to invent a
 * file name — and two people on two branches do not invent different ones.
 *
 * Adding an area means a file per language and one line per language here. The spread is shallow,
 * so two files in the same language must never declare the same top-level namespace; one would
 * silently win. `mobile/scripts/check-locales.mjs` fails if that happens.
 */
const bundle = (parts: Record<string, unknown>[]) => Object.assign({}, ...parts);

const en = bundle([
  enCommon,
  enOnboarding,
  enDriver,
  enLogistics,
  enGeo,
  enFarmer,
  enBuyer,
  enCoordinator
]);
const si = bundle([
  siCommon,
  siOnboarding,
  siDriver,
  siLogistics,
  siGeo,
  siFarmer,
  siBuyer,
  siCoordinator
]);
const ta = bundle([
  taCommon,
  taOnboarding,
  taDriver,
  taLogistics,
  taGeo,
  taFarmer,
  taBuyer,
  taCoordinator
]);

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
