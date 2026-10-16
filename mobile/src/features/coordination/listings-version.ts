import { useSyncExternalStore } from "react";

/**
 * A tiny shared "listings changed" signal (FARM-43 follow-up). `cooperative-listings.tsx` and
 * `region.tsx` fold this into their `useRequest` cache key; `listing-review/[id].tsx` bumps it
 * right after a decision. A mutation anywhere invalidates every subscriber immediately, instead
 * of relying on `useFocusEffect` firing when popping back onto a `NativeTabs` screen — which
 * `expo-router/unstable-native-tabs` does not do reliably (`.plans/DECISIONS.md` open question 1).
 */
let version = 0;
const listeners = new Set<() => void>();

export function bumpListingsVersion() {
  version += 1;
  listeners.forEach((l) => l());
}

export function useListingsVersion(): number {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => version
  );
}
