export const LOCALES = ["en", "zh", "zh-TW", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "msj-locale";
export const LOCALE_STORAGE_KEY = "msj-locale";

/** Native names — language pickers keep these fixed so the list stays recognizable. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  zh: "简",
  "zh-TW": "繁",
  ja: "日",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function bcp47(locale: Locale) {
  if (locale === "zh") return "zh-CN";
  if (locale === "zh-TW") return "zh-TW";
  if (locale === "ja") return "ja-JP";
  return "en-US";
}

export function acceptLanguageHeader(locale: Locale) {
  if (locale === "zh") return "zh-CN,zh;q=0.9,en;q=0.5";
  if (locale === "zh-TW") return "zh-TW,zh-Hant;q=0.9,zh;q=0.6,en;q=0.4";
  if (locale === "ja") return "ja-JP,ja;q=0.9,en;q=0.5";
  return "en-US,en;q=0.9";
}

function localeFromTag(tag: string): Locale | null {
  const lower = tag.trim().toLowerCase();
  if (!lower) return null;
  if (lower.startsWith("zh-tw") || lower.startsWith("zh-hant") || lower.startsWith("zh-hk") || lower.startsWith("zh-mo")) {
    return "zh-TW";
  }
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("en")) return "en";
  return null;
}

export function resolveLocale(cookie: string | undefined | null, acceptLanguage?: string | null): Locale {
  if (isLocale(cookie)) return cookie;
  const header = acceptLanguage ?? "";
  for (const part of header.split(",")) {
    const hit = localeFromTag(part.split(";")[0] ?? "");
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

export function localeFromNavigator(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const hit = localeFromTag(lang);
    if (hit) return hit;
  }
  return null;
}

let currentLocale: Locale = DEFAULT_LOCALE;

export function getCurrentLocale() {
  return currentLocale;
}

export function setCurrentLocale(locale: Locale) {
  currentLocale = locale;
}
