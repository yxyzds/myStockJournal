import { Hono } from "hono";
import type { AppEnv } from "../types";
import { searchQuotes } from "../market/quotes";

export const quotesRoutes = new Hono<AppEnv>();

quotesRoutes.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 1) return c.json({ items: [] });
  if (q.length > 32) return c.json({ error: "Query too long" }, 400);

  try {
    const items = await searchQuotes(q);
    return c.json({ items });
  } catch (error) {
    console.warn("quote search failed", error);
    return c.json({ error: "Search failed" }, 502);
  }
});
