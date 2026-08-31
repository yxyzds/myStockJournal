import { serve } from "@hono/node-server";
import { app } from "./app";
import { seedLocalUser } from "./db/seed-local-user";
import { env } from "./env";

try {
  await seedLocalUser();
} catch (error) {
  console.warn("Could not seed local user (is Postgres up?)", error);
}

serve(
  {
    fetch: app.fetch,
    port: env.apiPort,
  },
  (info) => {
    console.log(`API listening on http://localhost:${info.port}`);
  },
);
