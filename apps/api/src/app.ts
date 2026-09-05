import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";
import { quotesRoutes } from "./routes/quotes";
import { stockRoutes } from "./routes/stocks";
import { valuationRoutes } from "./routes/valuation";
import { decisionRoutes } from "./routes/decisions";
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
app.route("/decisions", decisionRoutes);
app.route("/quotes", quotesRoutes);
// Two routers share the /stocks prefix so valuation can live in its own file.
// Their paths do not overlap; the more specific one is mounted first anyway.
app.route("/stocks", valuationRoutes);
app.route("/stocks", stockRoutes);
