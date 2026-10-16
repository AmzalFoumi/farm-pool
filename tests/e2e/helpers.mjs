/** Shared plumbing for the end-to-end tests. No framework, no dependencies. */

import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "node:fs";

export const API = process.env.E2E_API_URL ?? "http://localhost:3000";

/**
 * A phone number no other test is using — across files, runs and machines.
 *
 * The number is the account identity, so uniqueness is the whole job. Two earlier attempts were
 * not enough and both failed in a way worth recording: a plain counter restarts every run and
 * collides with the last one, and a clock-seeded block collides between **files**, because
 * `node --test` runs them in parallel processes that all start in the same millisecond.
 *
 * So: random, with a retry in `signUp` for the rare clash. Six digits is a million slots against
 * a few dozen accounts a run.
 *
 * Everything starts `0770`, which is the marker to grep for when clearing test data off the
 * shared cluster. A Sri Lankan number is a leading 0 and nine digits; that prefix leaves six.
 */
const E2E_PHONE_PREFIX = "0770";

export function nextPhone() {
  const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `${E2E_PHONE_PREFIX}${digits}`;
}

export const PASSWORD = "e2epassword123";

async function call(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  return { status: res.status, body: json };
}

export const api = {
  get: (p, token) => call(p, { token }),
  post: (p, body, token) => call(p, { method: "POST", body, token }),
  put: (p, body, token) => call(p, { method: "PUT", body, token }),
  del: (p, token) => call(p, { method: "DELETE", token })
};

/**
 * Create an account and return its token and user.
 *
 * Retries on `phone_taken`, which is the one failure here that means "try another number" rather
 * than "something is wrong" — numbers are random, so a clash is luck, not a bug. Any other
 * failure throws immediately, because a test that quietly retried a 400 would hide it.
 */
export async function signUp(role, displayName, attempt = 0) {
  const phone = nextPhone();
  const { status, body } = await api.post("/identity/register", {
    displayName,
    phone,
    password: PASSWORD,
    role
  });
  if (status === 201) return { token: body.token, user: body.user, phone };
  if (body?.code === "phone_taken" && attempt < 5) {
    return signUp(role, displayName, attempt + 1);
  }
  throw new Error(`register ${role}: ${JSON.stringify(body)}`);
}

/**
 * Direct database access, used **only** for transitions the api cannot perform yet. Every caller
 * is marked `NUDGE:` — see the README. Reads `DATABASE_URI` from `api/.env` so the tests hit the
 * same database the running api does, rather than guessing.
 */
let client;
export async function db() {
  if (!client) {
    const env = readFileSync(new URL("../../api/.env", import.meta.url), "utf8");
    const uri = env.match(/^DATABASE_URI=(.+)$/m)?.[1]?.trim();
    if (!uri) throw new Error("No DATABASE_URI in api/.env");
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db("test");
}

export async function closeDb() {
  await client?.close();
  client = undefined;
}

/**
 * A farmer who can already act. Registration leaves a farmer `pending_review` (FARM-44) and the
 * api refuses every farmer route with `account_pending_review` until a coordinator approves them.
 *
 * The approve endpoint exists, but reaching it takes a coordinator whose cooperative covers the
 * farmer's district — a second story's worth of setup in front of every driver test. So this is
 * a NUDGE: like the two in the README, and then a fresh login, because `status` is baked into
 * the token and the one `signUp` returned still says `pending_review`.
 */
export async function signUpApprovedFarmer(displayName) {
  const farmer = await signUp("farmer", displayName);
  // NUDGE: coordinator approval needs a cooperative for the district (FARM-44).
  await (
    await db()
  )
    .collection("users")
    .updateOne({ _id: new ObjectId(farmer.user.id) }, { $set: { status: "active" } });

  const { status, body } = await api.post("/identity/login", {
    identifier: farmer.phone,
    password: PASSWORD
  });
  if (status !== 200) throw new Error(`login farmer: ${JSON.stringify(body)}`);
  return { token: body.token, user: body.user, phone: farmer.phone };
}
