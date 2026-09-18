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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (error) {
    throw new ApiError(
      0,
      "network_error",
      `Could not reach the server at ${API_URL}. ${error instanceof Error ? error.message : ""}`.trim()
    );
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
