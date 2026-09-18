import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Where the access token lives between app launches.
 *
 * On a phone it goes in the OS keychain / keystore via `expo-secure-store`, which is encrypted
 * at rest and not readable by other apps. `expo-secure-store` does not support web, so the web
 * build (used for quick checks, not for users) falls back to `localStorage`. Nothing else is
 * ever stored here — the user object is fetched fresh from `/identity/me` on every cold start.
 */
const TOKEN_KEY = "farm-pool.session-token";

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
    } catch {
      // Private mode or blocked storage: the session lasts until the tab closes. Acceptable.
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
    } catch {
      // nothing to clear
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
