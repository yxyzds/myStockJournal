import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

config({ path: resolve(fileURLToPath(new URL(".", import.meta.url)), "../../.env") });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
