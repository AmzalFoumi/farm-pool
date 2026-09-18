import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";

/**
 * Run one async request and expose its state to a screen.
 *
 * Deliberately tiny: no cache, no retries, no background refresh. It exists so every buyer screen
 * shows loading, error-with-retry and data the same way. If the app grows to need caching across
 * screens, that is the moment to bring in a query library (`.plans/DECISIONS.md`), not before.
 *
 * `key` is a string naming the inputs (`${token}|${id}`); the request re-runs when it changes.
 *
 *   const listings = useRequest(() => listingsApi.list(token), token);
 *   if (listings.status === "loading") …
 */
export type RequestState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "error"; data: undefined; error: ApiError }
  | { status: "ready"; data: T; error: undefined };

type Settled<T> =
  { attempt: string; ok: true; data: T } | { attempt: string; ok: false; error: ApiError };

export function useRequest<T>(
  run: () => Promise<T>,
  key: string
): RequestState<T> & {
  reload: () => void;
} {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  // Which load the current render is waiting for. "Loading" is derived by comparing this with
  // the attempt that last settled, so no state is written from inside the effect.
  const attempt = `${key}#${tick}`;

  // The latest `run` without making it a dependency; a screen passes a fresh closure each render.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    let active = true;
    runRef.current().then(
      (data) => {
        if (active) setSettled({ attempt, ok: true, data });
      },
      (error: unknown) => {
        if (!active) return;
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError(0, "unknown", error instanceof Error ? error.message : "Failed");
        setSettled({ attempt, ok: false, error: apiError });
      }
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  if (!settled || settled.attempt !== attempt) {
    return { status: "loading", data: undefined, error: undefined, reload };
  }
  return settled.ok
    ? { status: "ready", data: settled.data, error: undefined, reload }
    : { status: "error", data: undefined, error: settled.error, reload };
}

/** Re-run `reload` each time the screen regains focus, except the first time (the effect above
 *  already loaded). For lists that must reflect a change made on the screen that just closed. */
export function useReloadOnRefocus(reload: () => void) {
  const first = useRef(true);
  return useCallback(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    reload();
  }, [reload]);
}
