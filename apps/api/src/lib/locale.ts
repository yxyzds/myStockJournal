export type AppLocale = "en" | "zh" | "zh-TW" | "ja";

function tagLocale(tag: string): AppLocale | null {
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

export function requestLocale(acceptLanguage: string | undefined | null): AppLocale {
  const header = acceptLanguage ?? "";
  for (const part of header.split(",")) {
    const hit = tagLocale(part.split(";")[0] ?? "");
    if (hit) return hit;
  }
  return "en";
}

export function reviewLanguageName(locale: AppLocale) {
  if (locale === "zh") return "Simplified Chinese (简体中文)";
  if (locale === "zh-TW") return "Traditional Chinese (繁體中文)";
  if (locale === "ja") return "Japanese (日本語)";
  return "English";
}
