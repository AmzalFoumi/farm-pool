/**
 * Fails if the locale files have drifted apart.
 *
 * Four things go wrong with translation files and none of them are visible in review: a key is
 * added to English and never to the others, a key is renamed on one side only, a translator
 * helpfully "translates" a {{placeholder}} and the string renders a literal brace at a farm gate,
 * or — since the files were split per area — one language gains a file the others do not have.
 *
 * It also catches the one hazard the split introduced: the same top-level namespace declared in
 * two files of the same language. `index.ts` spreads them into one object, so the second would
 * silently overwrite the first and the loser's strings would vanish with nothing to show why.
 *
 * Run: node mobile/scripts/check-locales.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "../src/lib/i18n/locales");

const LOCALES = ["en", "si", "ta"];

/** Every area file in a language, `_review` excluded — that is metadata, not strings. */
const areasOf = (locale) =>
  readdirSync(join(dir, locale))
    .filter((f) => f.endsWith(".json") && f !== "_review.json")
    .map((f) => f.replace(/\.json$/, ""))
    .sort();

const read = (locale, area) => JSON.parse(readFileSync(join(dir, locale, `${area}.json`), "utf8"));

const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const placeholders = (s) => [...String(s).matchAll(/\{\{(\w+)/g)].map((m) => m[1]).sort();

let failed = false;
const fail = (msg, keys = []) => {
  failed = true;
  console.error(msg);
  for (const k of keys) console.error(`    ${k}`);
};

/* The set of area files must match across languages, or a whole screen's worth of Tamil can go
   missing without a single key looking wrong. */
const enAreas = areasOf("en");
for (const locale of ["si", "ta"]) {
  const areas = areasOf(locale);
  const missing = enAreas.filter((a) => !areas.includes(a));
  const extra = areas.filter((a) => !enAreas.includes(a));
  if (missing.length) fail(`${locale}: ${missing.length} area file(s) missing`, missing);
  if (extra.length) fail(`${locale}: ${extra.length} area file(s) not in en`, extra);
}

/* Load each language as one object, the way `index.ts` assembles it, failing on a namespace
   claimed by two files. */
const loadLocale = (locale) => {
  const merged = {};
  const owner = {};
  for (const area of areasOf(locale)) {
    for (const [ns, value] of Object.entries(read(locale, area))) {
      if (ns in owner) {
        fail(`${locale}: namespace "${ns}" is declared in both ${owner[ns]}.json and ${area}.json`);
      }
      owner[ns] = area;
      merged[ns] = value;
    }
  }
  return merged;
};

const en = flatten(loadLocale("en"));

for (const locale of LOCALES.slice(1)) {
  const other = flatten(loadLocale(locale));
  const missing = Object.keys(en).filter((k) => !(k in other));
  const extra = Object.keys(other).filter((k) => !(k in en));
  const drift = Object.keys(en).filter(
    (k) => k in other && placeholders(en[k]).join() !== placeholders(other[k]).join()
  );

  for (const [label, keys] of [
    ["missing", missing],
    ["unknown", extra],
    ["placeholder drift", drift]
  ]) {
    if (keys.length) fail(`${locale}: ${keys.length} ${label}`, keys);
  }

  const review = JSON.parse(readFileSync(join(dir, locale, "_review.json"), "utf8"));
  if (!review?.reviewedBy) {
    console.warn(`${locale}: still an unreviewed draft (_review.reviewedBy is empty)`);
  }
}

console.log(
  failed
    ? "locales: FAILED"
    : `locales: ok (${Object.keys(en).length} keys x 3, ${enAreas.length} areas)`
);
process.exit(failed ? 1 : 0);
