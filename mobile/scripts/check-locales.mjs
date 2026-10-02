/**
 * Fails if the locale files have drifted apart.
 *
 * Three things go wrong with translation files and none of them are visible in review: a key is
 * added to English and never to the others, a key is renamed on one side only, or a translator
 * helpfully "translates" a {{placeholder}} and the string renders a literal brace at a farm gate.
 *
 * Run: node mobile/scripts/check-locales.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "../src/lib/i18n/locales");
const load = (l) => JSON.parse(readFileSync(join(dir, `${l}.json`), "utf8"));

const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_review") continue; // translator metadata, not a string
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const placeholders = (s) => [...String(s).matchAll(/\{\{(\w+)/g)].map((m) => m[1]).sort();

const en = flatten(load("en"));
let failed = false;

for (const locale of ["si", "ta"]) {
  const other = flatten(load(locale));
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
    if (keys.length) {
      failed = true;
      console.error(`${locale}: ${keys.length} ${label}`);
      for (const k of keys) console.error(`    ${k}`);
    }
  }
  const review = load(locale)._review;
  if (!review?.reviewedBy) {
    console.warn(`${locale}: still an unreviewed draft (_review.reviewedBy is empty)`);
  }
}

console.log(failed ? "locales: FAILED" : `locales: ok (${Object.keys(en).length} keys x 3)`);
process.exit(failed ? 1 : 0);
