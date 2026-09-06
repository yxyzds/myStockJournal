import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { FilingRef, JudgmentItem } from "@mystockjournal/shared";
import type { AppEnv } from "../types";
import { db } from "../db";
import { judgmentItems, stocks } from "../db/schema";
import { getAnchors } from "../market/fundamentals";

export const judgmentRoutes = new Hono<AppEnv>();

const KEY_PREFIX = "filed:";

function filingKey(ticker: string, filing: FilingRef) {
  return `${ticker}|${filing.form}|${filing.filingDate}`;
}

function keyOf(detail: string) {
  if (!detail.startsWith(KEY_PREFIX)) return null;
  return detail.slice(KEY_PREFIX.length).split("\n")[0] ?? null;
}

function bodyOf(detail: string) {
  if (!detail.startsWith(KEY_PREFIX)) return detail;
  const idx = detail.indexOf("\n");
  return idx >= 0 ? detail.slice(idx + 1) : "";
}

function withKey(key: string, body: string) {
  return `${KEY_PREFIX}${key}\n${body}`;
}

function formatDay(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function copyFor(ticker: string, filing: FilingRef) {
  const filed = formatDay(filing.filingDate);
  const period = filing.reportDate ? formatDay(filing.reportDate) : null;
  const teaser = period
    ? `Filed ${filed} · period ending ${period}. Anchors on your DCF may be stale.`
    : `Filed ${filed}. Anchors on your DCF may be stale.`;
  const detail = period
    ? `${ticker} filed a ${filing.form} on ${filed}, covering the period ending ${period}. Review your DCF anchors and drivers against the new statements.`
    : `${ticker} filed a ${filing.form} on ${filed}. Review your DCF anchors and drivers against the new statements.`;
  return {
    title: `${ticker} ${filing.form} filed`,
    teaser,
    detail,
    actionLabel: "Review DCF",
    actionHref: `/stock/${ticker}/valuation`,
  };
}

function toItem(
  row: typeof judgmentItems.$inferSelect,
  ticker: string,
): JudgmentItem {
  return {
    id: row.id,
    ticker,
    title: row.title,
    teaser: row.teaser,
    detail: bodyOf(row.detail),
    actionLabel: row.actionLabel,
    actionHref: row.actionHref ?? `/stock/${ticker}/valuation`,
    form: tickerForm(row.title),
  };
}

function tickerForm(title: string) {
  const match = title.match(/\b(10-K|10-Q)\b/);
  return match?.[1] ?? "";
}

/**
 * GET /judgment — latest 10-K/10-Q on each watched ticker that the user has
 * not dismissed. Computed on read from EDGAR anchors (cached).
 */
judgmentRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const watched = await db
    .select()
    .from(stocks)
    .where(and(eq(stocks.userId, userId), eq(stocks.watched, true)));

  if (watched.length === 0) return c.json({ items: [] as JudgmentItem[] });

  const existing = await db.select().from(judgmentItems).where(eq(judgmentItems.userId, userId));
  const dismissedKeys = new Set(
    existing.filter((row) => row.dismissed).map((row) => keyOf(row.detail)).filter(Boolean),
  );
  const openByStock = new Map(
    existing.filter((row) => !row.dismissed && row.stockId).map((row) => [row.stockId as string, row]),
  );

  const items: JudgmentItem[] = [];

  const anchors = await Promise.all(watched.map((stock) => getAnchors(stock.ticker)));

  for (let i = 0; i < watched.length; i++) {
    const stock = watched[i];
    const latest = anchors[i].sourceFilings[0];
    if (!latest?.form || !latest.filingDate) continue;

    const key = filingKey(stock.ticker, latest);
    if (dismissedKeys.has(key)) continue;

    const copy = copyFor(stock.ticker, latest);
    const values = {
      title: copy.title,
      teaser: copy.teaser,
      detail: withKey(key, copy.detail),
      actionLabel: copy.actionLabel,
      actionHref: copy.actionHref,
    };

    const open = openByStock.get(stock.id);
    if (open && keyOf(open.detail) === key) {
      items.push(toItem(open, stock.ticker));
      continue;
    }

    if (open) {
      const updated = await db
        .update(judgmentItems)
        .set(values)
        .where(and(eq(judgmentItems.id, open.id), eq(judgmentItems.userId, userId)))
        .returning();
      if (updated[0]) items.push(toItem(updated[0], stock.ticker));
      continue;
    }

    const inserted = await db
      .insert(judgmentItems)
      .values({
        userId,
        stockId: stock.id,
        ...values,
      })
      .returning();
    if (inserted[0]) items.push(toItem(inserted[0], stock.ticker));
  }

  return c.json({ items });
});

/** POST /judgment/:id/dismiss — hide this filing until a newer one lands. */
judgmentRoutes.post("/:id/dismiss", async (c) => {
  const userId = c.get("userId");
  const updated = await db
    .update(judgmentItems)
    .set({ dismissed: true })
    .where(and(eq(judgmentItems.id, c.req.param("id")), eq(judgmentItems.userId, userId)))
    .returning({ id: judgmentItems.id });

  if (!updated[0]) return c.json({ error: "Item not found" }, 404);
  return c.json({ ok: true });
});
