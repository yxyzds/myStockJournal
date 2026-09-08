import { serve } from "@hono/node-server";
import { app } from "./app";
import { seedLocalUser } from "./db/seed-local-user";
import { seedWatchlist } from "./db/seed-watchlist";
import { allowDevUser, env } from "./env";

try {
  if (allowDevUser) {
    await seedLocalUser();
    await seedWatchlist(env.localUserId);
  }
} catch (error) {
  console.warn("Could not seed local data (is Postgres up?)", error);
}

serve(
  {
    fetch: app.fetch,
    hostname: env.apiHost,
    port: env.apiPort,
  },
  (info) => {
    console.log(`API listening on http://${info.address}:${info.port}`);
  },
);
