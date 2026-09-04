import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { fairValueFromOutputs, type WatchlistItem } from "@mystockjournal/shared";
import type { AppEnv } from "../types";
import { db } from "../db";
import { stocks, valuationModels } from "../db/schema";
import { TICKER_RE, parseTicker } from "../lib/stocks";
import { getQuotes } from "../market/quotes";

export const watchlistRoutes = new Hono<AppEnv>();

/**
 * GET /watchlist — the home page rows: quote, My Fair Value, and margin of
 * safety. Fair value comes from whichever model is flagged `isMyFairValue`, and
 * is null when the user has saved none or picked a method that produces none.
 */
watchlistRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.watched, true)));
  const quotes = await getQuotes(rows.map((r) => r.ticker));
  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q]));

  const models = rows.length
    ? await db
        .select()
        .from(valuationModels)
        .where(and(eq(valuationModels.userId, userId), eq(valuationModels.isMyFairValue, true)))
    : [];
  const fvByStock = new Map(
    models.map((m) => [m.stockId, fairValueFromOutputs(m.outputs)]),
  );

  const items: WatchlistItem[] = rows.map((row) => {
    const quote = quoteByTicker.get(row.ticker);
    const fairValue = fvByStock.get(row.id) ?? null;
    const price = quote?.price ?? null;
    // MOS vs prior close (Quote.price), not a live last trade.
    const mosPercent =
      fairValue != null && price != null && price !== 0 ? ((fairValue - price) / price) * 100 : null;
    return {
      stockId: row.id,
      ticker: row.ticker,
      name: quote?.name ?? row.name,
      price,
      currency: quote?.currency ?? "USD",
      changePercent: quote?.changePercent ?? null,
      previousClose: quote?.previousClose ?? null,
      fetchedAt: quote?.fetchedAt ?? null,
      fairValue,
      mosPercent,
    };
  });

  return c.json({ items });
});

/**
 * POST /watchlist — add a ticker. Re-watching a stock the user previously
 * removed flips the existing row back on, keeping its notes and valuations.
 * `created` reports whether the row newly appeared on the list.
 */
watchlistRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const requestBody = await c.req.json().catch(() => null);
  const raw = typeof requestBody?.ticker === "string" ? parseTicker(requestBody.ticker) : "";
  if (!TICKER_RE.test(raw)) {
    return c.json({ error: "Invalid ticker" }, 400);
  }

  const [quote] = await getQuotes([raw]);
  if (!quote) return c.json({ error: "Ticker not found" }, 404);

  const existing = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.ticker, quote.ticker)))
    .limit(1);

  if (existing[0]) {
    if (!existing[0].watched) {
      await db
        .update(stocks)
        .set({ watched: true, name: quote.name, updatedAt: new Date() })
        .where(eq(stocks.id, existing[0].id));
    }
    return c.json({
      ok: true,
      stockId: existing[0].id,
      ticker: existing[0].ticker,
      created: !existing[0].watched,
    });
  }

  const inserted = await db
    .insert(stocks)
    .values({
      userId,
      ticker: quote.ticker,
      name: quote.name,
      watched: true,
    })
    .returning({ id: stocks.id, ticker: stocks.ticker });

  return c.json({ ok: true, stockId: inserted[0].id, ticker: inserted[0].ticker, created: true }, 201);
});

/**
 * DELETE /watchlist/:ticker — take a stock off the list. Only clears `watched`;
 * notes, transactions, and valuation models survive so the history is intact if
 * the user adds it back.
 */
watchlistRoutes.delete("/:ticker", async (c) => {
  const userId = c.get("userId");
  const ticker = parseTicker(c.req.param("ticker") ?? "");
  if (!TICKER_RE.test(ticker)) {
    return c.json({ error: "Invalid ticker" }, 400);
  }

  const existing = await db
    .select({ id: stocks.id, ticker: stocks.ticker, watched: stocks.watched })
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.ticker, ticker)))
    .limit(1);

  if (!existing[0] || !existing[0].watched) {
    return c.json({ error: "Ticker not on watch list" }, 404);
  }

  await db
    .update(stocks)
    .set({ watched: false, updatedAt: new Date() })
    .where(eq(stocks.id, existing[0].id));

  return c.json({ ok: true, stockId: existing[0].id, ticker: existing[0].ticker });
});
