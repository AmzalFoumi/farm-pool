import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";

import i18n, { isLanguageCode, type LanguageCode } from "@/lib/i18n";

const LANGUAGE_KEY = "farm-pool.language";

type LocaleContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  /** False until the saved choice has been read, so nothing renders in the wrong script first. */
  ready: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Which language the app is in, app-wide (LP-91).
 *
 * Chosen on the welcome screen and remembered, because a driver should pick it once and never
 * again. Stored next to the session token in `expo-secure-store` — not because a language is a
 * secret, but because it is the key-value store this app already has, and one string does not
 * justify pulling in AsyncStorage. Web falls back to `localStorage`, as the token does.
 *
 * `ready` exists so the first paint is in the right script: reading the saved choice is async,
 * and a screen that renders in English and then re-renders in Sinhala is the same visible jump
 * the font loader already guards against.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void readLanguage().then((saved) => {
      if (!active) return;
      if (saved) {
        setLanguageState(saved);
        void i18n.changeLanguage(saved);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    /* State first, storage after: the switch should feel instant, and a failed write means the
       choice is forgotten next launch, not that the tap did nothing. */
    setLanguageState(next);
    void i18n.changeLanguage(next);
    void writeLanguage(next);
  }, []);

  const value = useMemo(() => ({ language, setLanguage, ready }), [language, setLanguage, ready]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * The current language.
 *
 * Returns `en` outside a provider rather than throwing, unlike `useAuth`. The gluestack `Text`
 * component calls this on every render to pick its font face, and a component tree rendered in
 * a test or a preview without the provider should fall back to Latin rather than crash.
 */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext) ?? { language: "en", setLanguage: () => {}, ready: true };
}

async function readLanguage(): Promise<LanguageCode | null> {
  try {
    const saved =
      Platform.OS === "web"
        ? (globalThis.localStorage?.getItem(LANGUAGE_KEY) ?? null)
        : await SecureStore.getItemAsync(LANGUAGE_KEY);
    return isLanguageCode(saved) ? saved : null;
  } catch {
    return null;
  }
}

async function writeLanguage(language: LanguageCode): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(LANGUAGE_KEY, language);
    else await SecureStore.setItemAsync(LANGUAGE_KEY, language);
  } catch {
    // Blocked storage: the choice lasts for this launch. Acceptable.
  }
}
