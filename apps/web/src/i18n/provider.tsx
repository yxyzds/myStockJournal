"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  bcp47,
  isLocale,
  localeFromNavigator,
  setCurrentLocale,
  type Locale,
} from "./locale";
import { messages } from "./messages";
import { translate, type TranslateVars } from "./translate";
import type { MessageKey } from "./types";

export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function persistLocale(locale: Locale) {
  setCurrentLocale(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = bcp47(locale);
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setCurrentLocale(initialLocale);
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored) && stored !== initialLocale) {
        setLocaleState(stored);
        persistLocale(stored);
        return;
      }
      if (!isLocale(stored)) {
        const fromBrowser = localeFromNavigator();
        if (fromBrowser && fromBrowser !== initialLocale) {
          setLocaleState(fromBrowser);
          persistLocale(fromBrowser);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    persistLocale(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => translate(messages[locale], key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
