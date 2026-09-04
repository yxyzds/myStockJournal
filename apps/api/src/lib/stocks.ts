import { and, eq } from "drizzle-orm";
import type { Quote } from "@mystockjournal/shared";
import { db } from "../db";
import { stocks } from "../db/schema";
import { getQuotes } from "../market/quotes";

/** Regex for a valid stock ticker (e.g. "AAPL", "BRK.B"). */
export const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;

export function parseTicker(raw: string) {
  return raw.trim().toUpperCase();
}

/** Parse a DB numeric or JSON value into a finite number, or null. */
export function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export type StockLookup =
  | { stock: typeof stocks.$inferSelect; quote: Quote }
  | { error: "Invalid ticker" | "Ticker not found"; status: 400 | 404 };

/**
 * Resolve a ticker to the user's stock row, creating an unwatched row the first
 * time they open it. Journaling or valuing a stock should not require adding it
 * to the watch list first.
 */
export async function getOrCreateStock(userId: string, rawTicker: string): Promise<StockLookup> {
  const ticker = parseTicker(rawTicker);
  if (!TICKER_RE.test(ticker)) return { error: "Invalid ticker", status: 400 };

  const [quote] = await getQuotes([ticker]);
  if (!quote) return { error: "Ticker not found", status: 404 };

  const existing = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.ticker, ticker)))
    .limit(1);

  if (existing[0]) return { stock: existing[0], quote };

  const inserted = await db
    .insert(stocks)
    .values({
      userId,
      ticker,
      name: quote.name,
      watched: false,
    })
    .returning();

  return { stock: inserted[0], quote };
}
