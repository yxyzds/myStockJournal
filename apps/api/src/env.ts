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
  /** Optional — Trade review returns 503 without it. */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};
