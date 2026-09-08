import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";
import { messages } from "./messages";
import { translate, type TranslateVars } from "./translate";
import type { MessageKey } from "./types";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, hdrs.get("accept-language"));
}

export async function getServerT() {
  const locale = await getRequestLocale();
  return {
    locale,
    t: (key: MessageKey, vars?: TranslateVars) => translate(messages[locale], key, vars),
  };
}
