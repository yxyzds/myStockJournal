import { Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { JournalEntry, JournalSnapshot, Quote, StockDetail, StockTransaction } from "@mystockjournal/shared";
import type { AppEnv } from "../types";
import { db } from "../db";
import { decisions, journalEntries, stocks } from "../db/schema";
import { getQuotes } from "../market/quotes";

const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;

function parseTicker(raw: string) {
  return raw.trim().toUpperCase();
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function todayNyDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function isCalendarDate(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month, day] = isoDate.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
}

function asSnapshot(value: unknown): JournalSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { price?: unknown; currency?: unknown; pe?: unknown };
  return {
    price: num(row.price),
    currency: typeof row.currency === "string" ? row.currency : "USD",
    pe: typeof row.pe === "string" ? row.pe : null,
  };
}

function snapshotFromQuote(quote: Quote | null): JournalSnapshot | null {
  if (!quote) return null;
  return { price: quote.price, currency: quote.currency, pe: null };
}

async function getOrCreateStock(userId: string, rawTicker: string) {
  const ticker = parseTicker(rawTicker);
  if (!TICKER_RE.test(ticker)) return { error: "Invalid ticker" as const, status: 400 as const };

  const [quote] = await getQuotes([ticker]);
  if (!quote) return { error: "Ticker not found" as const, status: 404 as const };

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

function toJournal(row: typeof journalEntries.$inferSelect): JournalEntry {
  return {
    id: row.id,
    stockId: row.stockId,
    date: row.date,
    text: row.text,
    snapshot: asSnapshot(row.snapshot),
    createdAt: row.createdAt.toISOString(),
  };
}

function toTransaction(row: typeof decisions.$inferSelect): StockTransaction | null {
  if (row.type !== "buy" && row.type !== "sell") return null;
  return {
    id: row.id,
    stockId: row.stockId,
    type: row.type,
    date: row.date,
    price: num(row.price),
    qty: num(row.qty),
    rationale: row.rationale,
    score: row.score,
  };
}

function parseTxnBody(body: unknown):
  | { error: string }
  | { type: "buy" | "sell"; date: string; price: string; qty: string; rationale: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const row = body as Record<string, unknown>;
  const type = row.type === "sell" ? "sell" : row.type === "buy" ? "buy" : null;
  if (!type) return { error: "Type must be buy or sell" };

  const rationale = typeof row.rationale === "string" ? row.rationale.trim() : "";
  if (!rationale) return { error: "Reason is required" };

  const price = num(row.price);
  if (price == null || price <= 0) return { error: "Price must be greater than 0" };

  const qty = num(row.qty);
  if (qty == null || qty <= 0) return { error: "Quantity must be greater than 0" };

  const dateRaw = typeof row.date === "string" ? row.date.trim() : "";
  if (!isCalendarDate(dateRaw)) return { error: "A valid date is required" };
  if (dateRaw > todayNyDate()) return { error: "Date cannot be in the future" };

  return {
    type,
    date: dateRaw,
    price: String(price),
    qty: String(qty),
    rationale,
  };
}

export const stockRoutes = new Hono<AppEnv>();

stockRoutes.get("/:ticker", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const { stock, quote } = found;
  const [journalRows, decisionRows] = await Promise.all([
    db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.userId, stock.userId),
          eq(journalEntries.stockId, stock.id),
          eq(journalEntries.archived, false),
        ),
      )
      .orderBy(asc(journalEntries.date), asc(journalEntries.createdAt)),
    db
      .select()
      .from(decisions)
      .where(and(eq(decisions.userId, stock.userId), eq(decisions.stockId, stock.id)))
      .orderBy(asc(decisions.date), asc(decisions.createdAt)),
  ]);

  const payload: StockDetail = {
    stock: {
      id: stock.id,
      ticker: stock.ticker,
      name: quote.name || stock.name,
      watched: stock.watched,
    },
    quote,
    journal: journalRows.map(toJournal),
    transactions: decisionRows.map(toTransaction).filter((row): row is StockTransaction => row != null),
  };

  return c.json(payload);
});

stockRoutes.post("/:ticker/journal", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const body = await c.req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ error: "Entry text is required" }, 400);

  const inserted = await db
    .insert(journalEntries)
    .values({
      userId: found.stock.userId,
      stockId: found.stock.id,
      date: todayNyDate(),
      text,
      snapshot: snapshotFromQuote(found.quote),
    })
    .returning();

  return c.json({ entry: toJournal(inserted[0]) }, 201);
});

stockRoutes.patch("/:ticker/journal/:entryId", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const body = await c.req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return c.json({ error: "Entry text is required" }, 400);

  const updated = await db
    .update(journalEntries)
    .set({ text })
    .where(
      and(
        eq(journalEntries.id, c.req.param("entryId")),
        eq(journalEntries.userId, found.stock.userId),
        eq(journalEntries.stockId, found.stock.id),
        eq(journalEntries.archived, false),
      ),
    )
    .returning();

  if (!updated[0]) return c.json({ error: "Entry not found" }, 404);
  return c.json({ entry: toJournal(updated[0]) });
});

stockRoutes.delete("/:ticker/journal/:entryId", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const deleted = await db
    .delete(journalEntries)
    .where(
      and(
        eq(journalEntries.id, c.req.param("entryId")),
        eq(journalEntries.userId, found.stock.userId),
        eq(journalEntries.stockId, found.stock.id),
      ),
    )
    .returning({ id: journalEntries.id });

  if (!deleted[0]) return c.json({ error: "Entry not found" }, 404);
  return c.json({ ok: true });
});

stockRoutes.post("/:ticker/transactions", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const parsed = parseTxnBody(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json({ error: parsed.error }, 400);

  const inserted = await db
    .insert(decisions)
    .values({
      userId: found.stock.userId,
      stockId: found.stock.id,
      type: parsed.type,
      date: parsed.date,
      price: parsed.price,
      qty: parsed.qty,
      rationale: parsed.rationale,
    })
    .returning();

  const txn = toTransaction(inserted[0]);
  return c.json({ transaction: txn }, 201);
});

stockRoutes.patch("/:ticker/transactions/:id", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const parsed = parseTxnBody(await c.req.json().catch(() => null));
  if ("error" in parsed) return c.json({ error: parsed.error }, 400);

  const updated = await db
    .update(decisions)
    .set({
      type: parsed.type,
      date: parsed.date,
      price: parsed.price,
      qty: parsed.qty,
      rationale: parsed.rationale,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(decisions.id, c.req.param("id")),
        eq(decisions.userId, found.stock.userId),
        eq(decisions.stockId, found.stock.id),
        inArray(decisions.type, ["buy", "sell"]),
      ),
    )
    .returning();

  if (!updated[0]) return c.json({ error: "Transaction not found" }, 404);
  const txn = toTransaction(updated[0]);
  return c.json({ transaction: txn });
});

stockRoutes.delete("/:ticker/transactions/:id", async (c) => {
  const found = await getOrCreateStock(c.get("userId"), c.req.param("ticker"));
  if ("error" in found) return c.json({ error: found.error }, found.status);

  const deleted = await db
    .delete(decisions)
    .where(
      and(
        eq(decisions.id, c.req.param("id")),
        eq(decisions.userId, found.stock.userId),
        eq(decisions.stockId, found.stock.id),
        inArray(decisions.type, ["buy", "sell"]),
      ),
    )
    .returning({ id: decisions.id });

  if (!deleted[0]) return c.json({ error: "Transaction not found" }, 404);
  return c.json({ ok: true });
});
