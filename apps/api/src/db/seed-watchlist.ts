import { and, eq } from "drizzle-orm";
import { G7_TICKERS, buildValuation, dcfInputsFromAnchors } from "@mystockjournal/shared";
import { env } from "../env";
import { getAnchors } from "../market/fundamentals";
import { getQuotes } from "../market/quotes";
import { fetchHottestTickers } from "../market/trending";
import { db } from "./index";
import { journalEntries, stocks, valuationModels } from "./schema";

/**
 * Magnificent 7 — the default G7 watch-list names. Only these get a starter
 * DCF and a journal prompt; everything else stays empty.
 */
const G7_NAMES: Record<(typeof G7_TICKERS)[number], string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corp.",
  META: "Meta Platforms Inc.",
  TSLA: "Tesla Inc.",
};

const G7 = G7_TICKERS.map((ticker) => ({ ticker, name: G7_NAMES[ticker] }));
const G7_SET = new Set<string>(G7_TICKERS);
const HOT_COUNT = 3;

function todayNyDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function journalTip(ticker: string) {
  return `This is your journal for ${ticker}. Write down your thesis, what you're watching, and what would change your mind.`;
}

function nextYear() {
  return new Date().getFullYear() + 1;
}

async function ensureWatchedStock(userId: string, ticker: string, fallbackName: string) {
  const [quote] = await getQuotes([ticker]);
  const name = quote?.name || fallbackName;
  const existing = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.ticker, ticker)))
    .limit(1);

  if (existing[0]) {
    if (!existing[0].watched) {
      const updated = await db
        .update(stocks)
        .set({ watched: true, name, updatedAt: new Date() })
        .where(eq(stocks.id, existing[0].id))
        .returning();
      return updated[0];
    }
    return existing[0];
  }

  const inserted = await db
    .insert(stocks)
    .values({ userId, ticker, name, watched: true })
    .returning();
  return inserted[0];
}

async function ensureG7Journal(userId: string, stockId: string, ticker: string) {
  const existing = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        eq(journalEntries.stockId, stockId),
        eq(journalEntries.archived, false),
      ),
    )
    .limit(1);
  if (existing[0]) return;

  const [quote] = await getQuotes([ticker]);
  await db.insert(journalEntries).values({
    userId,
    stockId,
    date: todayNyDate(),
    text: journalTip(ticker),
    snapshot: quote
      ? { price: quote.price, currency: quote.currency, pe: null }
      : null,
  });
}

async function ensureG7Dcf(userId: string, stockId: string, ticker: string) {
  const existing = await db
    .select({ id: valuationModels.id })
    .from(valuationModels)
    .where(
      and(
        eq(valuationModels.userId, userId),
        eq(valuationModels.stockId, stockId),
        eq(valuationModels.method, "dcf"),
      ),
    )
    .limit(1);
  if (existing[0]) return;

  const [quote] = await getQuotes([ticker]);
  const price = quote?.price ?? 0;
  if (price <= 0) return;

  const anchors = await getAnchors(ticker);
  const built = buildValuation("dcf", dcfInputsFromAnchors(anchors), {
    currentPrice: price,
    startYear: nextYear(),
  });
  if ("error" in built) {
    console.warn(`seed DCF skipped for ${ticker}: ${built.error}`);
    return;
  }

  await db.insert(valuationModels).values({
    userId,
    stockId,
    method: "dcf",
    assumptions: { ...built.assumptions, source: "seed" },
    outputs: built.outputs,
    isMyFairValue: true,
  });
}

/**
 * First visit: G7 + the 3 hottest names outside G7.
 * Later starts: add any missing G7, never reshuffle the hot names.
 * Only G7 get a starter DCF and journal tip.
 */
export async function seedWatchlist() {
  const userId = env.localUserId;

  const watched = await db
    .select({ ticker: stocks.ticker })
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.watched, true)));
  const isNewUser = watched.length === 0;

  const hot = isNewUser ? await fetchHottestTickers(HOT_COUNT, G7_SET) : [];

  for (const row of G7) {
    const stock = await ensureWatchedStock(userId, row.ticker, row.name);
    await ensureG7Journal(userId, stock.id, row.ticker);
    await ensureG7Dcf(userId, stock.id, row.ticker);
  }

  for (const ticker of hot) {
    await ensureWatchedStock(userId, ticker, ticker);
  }
}
