import type { MessageKey, Messages } from "./types";

export type TranslateVars = Record<string, string | number>;

export function lookup(messages: Messages, key: MessageKey): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

export function interpolate(template: string, vars?: TranslateVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name]),
  );
}

export function translate(messages: Messages, key: MessageKey, vars?: TranslateVars) {
  return interpolate(lookup(messages, key), vars);
}
