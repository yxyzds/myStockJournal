import { Hono } from "hono";
import { cors } from "hono/cors";
import { resolveUser } from "./auth";
import { getAppUser, updateAppUser, usernameFromEmail } from "./lib/users";
import { quotesRoutes } from "./routes/quotes";
import { stockRoutes } from "./routes/stocks";
import { valuationRoutes } from "./routes/valuation";
import { decisionRoutes } from "./routes/decisions";
import { watchlistRoutes } from "./routes/watchlist";
import { judgmentRoutes } from "./routes/judgment";
import type { AppEnv } from "./types";

export const app = new Hono<AppEnv>();

app.use("*", cors());
app.use("*", resolveUser);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "mystockjournal-api",
    userId: c.get("userId") ?? null,
  }),
);

function toMe(user: { id: string; email: string; name: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: usernameFromEmail(user.email),
  };
}

app.get("/me", async (c) => {
  const user = await getAppUser(c.get("userId"));
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(toMe(user));
});

app.patch("/me", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { name?: unknown; email?: unknown } | null;
  if (!body || typeof body.name !== "string" || typeof body.email !== "string") {
    return c.json({ error: "name and email are required" }, 400);
  }
  try {
    const user = await updateAppUser(c.get("userId"), c.get("clerkUserId"), {
      name: body.name,
      email: body.email,
    });
    return c.json(toMe(user));
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    const message = error instanceof Error ? error.message : "Could not save profile";
    if (status === 400 || status === 409) return c.json({ error: message }, status);
    console.warn("PATCH /me failed", error);
    return c.json({ error: "Could not save profile" }, 500);
  }
});

app.route("/watchlist", watchlistRoutes);
app.route("/judgment", judgmentRoutes);
app.route("/decisions", decisionRoutes);
app.route("/quotes", quotesRoutes);
// Two routers share the /stocks prefix so valuation can live in its own file.
// Their paths do not overlap; the more specific one is mounted first anyway.
app.route("/stocks", valuationRoutes);
app.route("/stocks", stockRoutes);
