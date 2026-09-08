import { acceptLanguageHeader, getCurrentLocale } from "@/i18n/locale";
import { apiErrorKey } from "@/i18n/api-errors";
import { messages } from "@/i18n/messages";
import { translate } from "@/i18n/translate";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function localizeError(message: string) {
  const key = apiErrorKey(message);
  if (!key) return message;
  const locale = getCurrentLocale();
  if (key === "errors.methodUnavailable") {
    const method = message.replace(/ is not available yet$/, "");
    return translate(messages[locale], key, { method });
  }
  return translate(messages[locale], key);
}

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenGetter ? await tokenGetter() : null;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", acceptLanguageHeader(getCurrentLocale()));
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = translate(messages[getCurrentLocale()], "errors.requestFailed", { status: res.status });
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = localizeError(body.error);
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}
