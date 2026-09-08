import "../../../scripts/load-root-env.mjs";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export const isProduction = process.env.NODE_ENV === "production";

const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? "";
const localUserId = isProduction ? "" : (process.env.DEV_USER_ID ?? "");

if (isProduction) {
  if (!clerkSecretKey) throw new Error("Production requires CLERK_SECRET_KEY");
} else if (!clerkSecretKey && !localUserId) {
  throw new Error("Missing CLERK_SECRET_KEY or DEV_USER_ID (set DEV_USER_* in .env.development)");
}

/** True only for local `pnpm dev` without Clerk — never in production. */
export const allowDevUser = Boolean(!isProduction && !clerkSecretKey && localUserId);

function listenPort() {
  const apiPort = process.env.API_PORT;
  const hostPort = process.env.PORT;
  const raw = isProduction ? hostPort || apiPort || "3001" : apiPort || hostPort || "3001";
  const port = Number(raw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid listen port: ${raw}`);
  }
  return port;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  /** Local: `API_PORT` (default 3001). Production: platform `PORT`, then `API_PORT`. */
  apiPort: listenPort(),
  /** Railway / containers need 0.0.0.0; localhost still works on 127.0.0.1. */
  apiHost: "0.0.0.0" as const,
  clerkSecretKey,
  localUserId,
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
