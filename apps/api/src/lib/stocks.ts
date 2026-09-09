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

export type StockRowLookup =
  | { stock: typeof stocks.$inferSelect }
  | { error: "Invalid ticker" | "Ticker not found"; status: 400 | 404 };

async function selectUserStock(userId: string, ticker: string) {
  const rows = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.ticker, ticker)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Screenshot import only needs the ticker row. Skip the live quote when the
 * stock already exists — that fetch was delaying vision by a second or more.
 */
export async function getOrCreateStockRow(userId: string, rawTicker: string): Promise<StockRowLookup> {
  const ticker = parseTicker(rawTicker);
  if (!TICKER_RE.test(ticker)) return { error: "Invalid ticker", status: 400 };

  const existing = await selectUserStock(userId, ticker);
  if (existing) return { stock: existing };

  const created = await getOrCreateStock(userId, ticker);
  if ("error" in created) return created;
  return { stock: created.stock };
}

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

  const existing = await selectUserStock(userId, ticker);
  if (existing) return { stock: existing, quote };

  // Opening a new ticker fires several API calls at once; two inserts would
  // trip stocks_user_ticker_uidx. Ignore the loser and read the winner's row.
  const inserted = await db
    .insert(stocks)
    .values({
      userId,
      ticker,
      name: quote.name,
      watched: false,
    })
    .onConflictDoNothing({ target: [stocks.userId, stocks.ticker] })
    .returning();

  if (inserted[0]) return { stock: inserted[0], quote };

  const created = await selectUserStock(userId, ticker);

  if (created) return { stock: created, quote };
  return { error: "Ticker not found", status: 404 };
}
