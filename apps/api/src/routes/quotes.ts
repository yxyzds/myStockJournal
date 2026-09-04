import { Hono } from "hono";
import type { AppEnv } from "../types";
import { searchQuotes } from "../market/quotes";

export const quotesRoutes = new Hono<AppEnv>();

/**
 * GET /quotes/search?q= — ticker and company-name lookup for the add-stock box.
 * An empty query is an empty result, not an error, so the field can call this on
 * every keystroke. Vendor failures surface as 502 rather than crashing the page.
 */
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
