import { serve } from "@hono/node-server";
import { app } from "./app";
import { seedLocalUser } from "./db/seed-local-user";
import { seedWatchlist } from "./db/seed-watchlist";
import { env } from "./env";

try {
  await seedLocalUser();
  await seedWatchlist();
} catch (error) {
  console.warn("Could not seed local data (is Postgres up?)", error);
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
