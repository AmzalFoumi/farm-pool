/** Shared plumbing for the end-to-end tests. No framework, no dependencies. */

import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";

export const API = process.env.E2E_API_URL ?? "http://localhost:3000";

/** Throwaway accounts live in this block so a human can spot and delete them. A Sri Lankan
 *  number is a leading 0 and nine digits, so the prefix leaves room for exactly two. */
const E2E_PHONE_PREFIX = "07700099";

let phoneCounter = 0;
/** A phone number no other test is using. Numbers are the account identity, so they cannot clash. */
export function nextPhone() {
  return `${E2E_PHONE_PREFIX}${String(phoneCounter++).padStart(2, "0")}`;
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

/** Create an account and return its token and user. */
export async function signUp(role, displayName) {
  const phone = nextPhone();
  const { status, body } = await api.post("/identity/register", {
    displayName,
    phone,
    password: PASSWORD,
    role
  });
  if (status !== 201) throw new Error(`register ${role}: ${JSON.stringify(body)}`);
  return { token: body.token, user: body.user, phone };
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
