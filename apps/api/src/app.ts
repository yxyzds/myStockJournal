import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { quotesRoutes } from "./routes/quotes";
import { stockRoutes } from "./routes/stocks";
import { watchlistRoutes } from "./routes/watchlist";
import type { AppEnv } from "./types";

export const app = new Hono<AppEnv>();

app.use("*", cors());

app.use("*", async (c, next) => {
  c.set("userId", env.localUserId);
  await next();
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "mystockjournal-api",
    userId: c.get("userId"),
  }),
);

app.get("/me", (c) =>
  c.json({
    id: env.localUserId,
    email: env.localUserEmail,
    name: env.localUserName,
  }),
);

app.route("/watchlist", watchlistRoutes);
app.route("/quotes", quotesRoutes);
app.route("/stocks", stockRoutes);
