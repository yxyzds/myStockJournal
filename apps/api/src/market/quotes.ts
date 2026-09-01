import { inArray } from "drizzle-orm";
import type { Quote } from "@mystockjournal/shared";
import { db } from "../db";
import { quoteCache } from "../db/schema";
import { fetchTencentQuotes, searchTencent } from "./tencent";

const NY_TZ = "America/New_York";

/** Parse a DB numeric/string into a finite number, or null. */
function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Map a `quote_cache` row onto the shared Quote type. */
function toQuote(row: {
  ticker: string;
  price: string;
  currency: string;
  changePercent: string | null;
  previousClose: string | null;
  shortName: string | null;
  fetchedAt: Date;
}): Quote {
  return {
    ticker: row.ticker,
    name: row.shortName ?? row.ticker,
    price: num(row.price),
    currency: row.currency || "USD",
    changePercent: num(row.changePercent),
    previousClose: num(row.previousClose),
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

/** Load quotes from Postgres, keyed by ticker. Returns an empty map if the cache table is unavailable. */
async function readCache(tickers: string[]): Promise<Map<string, Quote>> {
  if (tickers.length === 0) return new Map();
  try {
    const rows = await db.select().from(quoteCache).where(inArray(quoteCache.ticker, tickers));
    return new Map(rows.map((row) => [row.ticker, toQuote(row)]));
  } catch (error) {
    console.warn("quote cache read failed", error);
    return new Map();
  }
}

/** Upsert quotes into `quote_cache`. Needs a last trade or a prior close. */
async function writeCache(quotes: Quote[]) {
  if (quotes.length === 0) return;
  try {
    for (const q of quotes) {
      const storedPrice = q.price ?? q.previousClose;
      if (storedPrice == null) continue;
      await db
        .insert(quoteCache)
        .values({
          ticker: q.ticker,
          price: String(storedPrice),
          currency: q.currency,
          changePercent: q.changePercent == null ? null : String(q.changePercent),
          previousClose: q.previousClose == null ? null : String(q.previousClose),
          shortName: q.name,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: quoteCache.ticker,
          set: {
            price: String(storedPrice),
            currency: q.currency,
            changePercent: q.changePercent == null ? null : String(q.changePercent),
            previousClose: q.previousClose == null ? null : String(q.previousClose),
            shortName: q.name,
            fetchedAt: new Date(),
          },
        });
    }
  } catch (error) {
    console.warn("quote cache write failed", error);
  }
}

/** Calendar date in US Eastern (YYYY-MM-DD), where US cash equities settle. */
function nyDate(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: NY_TZ });
}

/**
 * This journal values stocks off the last completed close, not a live tick.
 * Prefer previousClose; fall back to last trade if the vendor omitted it.
 */
function asValuationQuote(quote: Quote): Quote {
  return {
    ...quote,
    price: quote.previousClose ?? quote.price,
  };
}

/** True when this row was already fetched today in America/New_York. */
function isFresh(quote: Quote) {
  if (!quote.fetchedAt) return false;
  return nyDate(new Date(quote.fetchedAt)) === nyDate(new Date());
}

/**
 * Batch-fetch quotes for known tickers (not a text search).
 * Prices are prior close. Cache is reused until the next US trading calendar day.
 */
export async function getQuotes(tickers: string[]): Promise<Quote[]> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) return [];

  const cached = await readCache(unique);
  const stale = unique.filter((t) => {
    const hit = cached.get(t);
    return !hit || !isFresh(hit);
  });

  if (stale.length > 0) {
    try {
      const fresh = await fetchTencentQuotes(stale);
      await writeCache(fresh);
      for (const q of fresh) cached.set(q.ticker, q);
    } catch (error) {
      console.warn("quote fetch failed", error);
    }
  }

  return unique
    .map((t) => cached.get(t))
    .filter((q): q is Quote => q != null)
    .map(asValuationQuote);
}

/**
 * Search by name or ticker fragment (e.g. "apple", "MSFT"), then load quotes for the hits.
 * Prefers an English company name from the quote payload when one exists.
 */
export async function searchQuotes(query: string): Promise<Quote[]> {
  const q = query.trim();
  if (!q) return [];
  const hits = await searchTencent(q);
  const quotes = await getQuotes(hits.map((h) => h.ticker));
  const names = new Map(hits.map((h) => [h.ticker, h.name]));
  return quotes.map((quote) => {
    const searchName = names.get(quote.ticker);
    const quoteIsEnglish = /[A-Za-z]{3,}/.test(quote.name);
    return {
      ...quote,
      name: quoteIsEnglish ? quote.name : searchName || quote.name,
    };
  });
}
