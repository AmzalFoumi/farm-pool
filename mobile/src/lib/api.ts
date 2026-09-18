import { apiErrorSchema } from "@farm-pool/shared";
import type { ZodType } from "zod";

/**
 * The one way the app talks to the api.
 *
 * `apiFetch` adds the base URL, the JSON headers and the bearer token, and turns every failure
 * into an `ApiError` with the api's stable `code` — so a screen switches on `error.code`, never
 * on a status number or a message string. Pass a `schema` from `@farm-pool/shared` and the
 * response is validated before it is returned, so a backend change that breaks the contract
 * fails loudly here instead of as `undefined` three screens later.
 */

/** Set in `mobile/.env` (see `.env.example`). On a phone it must be the machine's LAN address. */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** How long one request may take before it counts as `network_error`. Long enough for a rural
 *  3G round trip; short enough that a stalled `/identity/me` on cold start cannot hold the
 *  splash screen until the OS gives up (30-60 s on Android). */
const REQUEST_TIMEOUT_MS = 15_000;

/* Passwords and bearer tokens travel on every call, so anything but a development build must
 * use HTTPS. `__DEV__` is true under `expo start` and false in a release build, so the plain-HTTP
 * localhost/LAN workflow keeps working and a misconfigured release fails at first launch, loudly,
 * instead of leaking credentials quietly. */
if (!__DEV__ && !API_URL.startsWith("https://")) {
  throw new Error(`EXPO_PUBLIC_API_URL must use https:// in a release build, got ${API_URL}`);
}

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request never reached the api. */
    public readonly status: number,
    /** The api's stable code (`phone_taken`, `unauthorized`, …), or one of the client-side
     *  codes: `network_error`, `bad_response`. */
    public readonly code: string,
    message: string,
    /** Field-level messages, present for `validation_error` only. */
    public readonly issues: { path: string; message: string }[] = []
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The message for one field, if the api reported one. */
  fieldMessage(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message;
  }
}

type ApiFetchOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  /** Validates the response body. Omit for endpoints that return nothing useful. */
  schema?: ZodType<T>;
};

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, token, schema }: ApiFetchOptions<T> = {}
): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    const reason = controller.signal.aborted
      ? `No answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`
      : error instanceof Error
        ? error.message
        : "";
    throw new ApiError(
      0,
      "network_error",
      `Could not reach the server at ${API_URL}. ${reason}`.trim()
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  const json: unknown = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) {
      throw new ApiError(
        response.status,
        parsed.data.code,
        parsed.data.message,
        parsed.data.issues
      );
    }
    throw new ApiError(
      response.status,
      "bad_response",
      `Request failed with status ${response.status}`
    );
  }

  if (!schema) return json as T;
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      response.status,
      "bad_response",
      "The server answered in an unexpected shape"
    );
  }
  return parsed.data;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
