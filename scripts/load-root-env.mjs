import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const isProduction = process.env.NODE_ENV === "production";
const fromHost = new Set(Object.keys(process.env));

function applyFile(name, { override }) {
  const file = resolve(root, name);
  if (!existsSync(file)) return;
  for (const [key, value] of Object.entries(parseEnv(readFileSync(file, "utf8")))) {
    if (value === undefined || fromHost.has(key)) continue;
    if (override || process.env[key] === undefined) process.env[key] = value;
  }
}

applyFile(".env", { override: false });
if (!isProduction) applyFile(".env.development", { override: true });
applyFile(".env.local", { override: true });
if (isProduction) applyFile(".env.production", { override: true });

/** Production never inherits a local HTTP proxy unless the host opts in. */
if (isProduction && process.env.USE_HTTP_PROXY !== "1") {
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.ALL_PROXY;
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  delete process.env.all_proxy;
}
