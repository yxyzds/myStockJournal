import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(import.meta.dirname, "../../../.env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  apiPort: Number(process.env.API_PORT ?? 3001),
  localUserId: required("DEV_USER_ID"),
  localUserEmail: process.env.DEV_USER_EMAIL ?? "dev@localhost",
  localUserName: process.env.DEV_USER_NAME ?? "Dev",
  /** SEC rejects requests without a contact address. See https://www.sec.gov/os/webmaster-faq. */
  secUserAgent: process.env.SEC_USER_AGENT ?? "",
  /**
   * Chat Completions relay (中转站). Example: https://your-proxy.example/v1
   * Requests go to `${AI_BASE_URL}/chat/completions`. No vendor SDK.
   */
  aiBaseUrl: (process.env.AI_BASE_URL ?? "").replace(/\/+$/, ""),
  aiApiKey: process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "claude-sonnet-5",
  /**
   * Send `response_format: json_object`. Off by default — many Claude relays
   * reject it; the prompt already asks for JSON.
   */
  aiJsonMode: process.env.AI_JSON_MODE === "1" || process.env.AI_JSON_MODE === "true",
};
