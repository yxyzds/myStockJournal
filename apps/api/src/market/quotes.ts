import { inArray } from "drizzle-orm";
import type { Quote } from "@mystockjournal/shared";
import { db } from "../db";
import { quoteCache } from "../db/schema";
import { fetchTencentQuotes, searchTencent } from "./tencent";

const TTL_MS = 5 * 60 * 1000;

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

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

async function writeCache(quotes: Quote[]) {
  if (quotes.length === 0) return;
  try {
    for (const q of quotes) {
      if (q.price == null) continue;
      await db
        .insert(quoteCache)
        .values({
          ticker: q.ticker,
          price: String(q.price),
          currency: q.currency,
          changePercent: q.changePercent == null ? null : String(q.changePercent),
          previousClose: q.previousClose == null ? null : String(q.previousClose),
          shortName: q.name,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: quoteCache.ticker,
          set: {
            price: String(q.price),
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

function isFresh(quote: Quote) {
  if (!quote.fetchedAt) return false;
  return Date.now() - new Date(quote.fetchedAt).getTime() < TTL_MS;
}

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

  return unique.map((t) => cached.get(t)).filter((q): q is Quote => q != null);
}

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
