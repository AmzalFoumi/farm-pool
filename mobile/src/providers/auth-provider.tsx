import type { LoginInput, PublicUser, RegisterInput } from "@farm-pool/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { ApiError } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/session-storage";

/**
 * Who is signed in, app-wide.
 *
 * - `loading`     — cold start; the saved token (if any) is being checked against `/identity/me`.
 *                   The root layout keeps the splash up until this is over.
 * - `signed-out`  — no usable session. The root stack shows onboarding.
 * - `signed-in`   — `user` is the fresh record from the api, not a cached copy.
 *
 * The cold-start check never hangs: a 401 or 404 clears the stored token; a network failure
 * (api down, wrong `EXPO_PUBLIC_API_URL`) also lands on `signed-out` but *keeps* the token, so
 * the next launch tries again rather than making the user log in because the Wi-Fi dropped.
 */
export type AuthStatus = "loading" | "signed-out" | "signed-in";

export type AuthState =
  | { status: "loading"; user: null; token: null }
  | { status: "signed-out"; user: null; token: null }
  | { status: "signed-in"; user: PublicUser; token: string };

type AuthContextValue = AuthState & {
  signIn(input: LoginInput): Promise<PublicUser>;
  signUp(input: RegisterInput): Promise<PublicUser>;
  signOut(): Promise<void>;
  /** Re-check the saved session against the api (after a profile edit, say). */
  refresh(): Promise<void>;
};

const SIGNED_OUT: AuthState = { status: "signed-out", user: null, token: null };

const AuthContext = createContext<AuthContextValue | null>(null);

/** Resolve the saved session to a state. Pure: no React in here, so it is safe to call from an
 *  effect and to unit-test on its own. */
async function loadSession(): Promise<AuthState> {
  const token = await getSessionToken();
  if (!token) return SIGNED_OUT;
  try {
    const user = await authApi.me(token);
    return { status: "signed-in", user, token };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      await clearSessionToken();
    }
    return SIGNED_OUT;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, token: null });

  useEffect(() => {
    let active = true;
    loadSession().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const adopt = useCallback(async (token: string, user: PublicUser) => {
    await setSessionToken(token);
    setState({ status: "signed-in", user, token });
    return user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async signIn(input) {
        const { token, user } = await authApi.login(input);
        return adopt(token, user);
      },
      async signUp(input) {
        const { token, user } = await authApi.register(input);
        return adopt(token, user);
      },
      async signOut() {
        // Device-side only: the api has no session to end (see .plans/auth/README.md).
        await clearSessionToken();
        setState(SIGNED_OUT);
      },
      async refresh() {
        setState(await loadSession());
      }
    }),
    [state, adopt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
