import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { isTradeReviewGrade, type RecentDecision } from "@mystockjournal/shared";
import type { AppEnv } from "../types";
import { db } from "../db";
import { decisions, stocks } from "../db/schema";
import { num } from "../lib/stocks";

export const decisionRoutes = new Hono<AppEnv>();

function gradeFrom(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const grade = (value as { grade?: unknown }).grade;
  return isTradeReviewGrade(grade) ? grade : null;
}

/**
 * GET /decisions/recent — latest completed actions for the home feed.
 */
decisionRoutes.get("/recent", async (c) => {
  const userId = c.get("userId");
  const rows = await db
    .select({
      id: decisions.id,
      type: decisions.type,
      date: decisions.date,
      rationale: decisions.rationale,
      qty: decisions.qty,
      ticker: stocks.ticker,
      name: stocks.name,
      tradeReview: stocks.tradeReview,
    })
    .from(decisions)
    .innerJoin(stocks, eq(decisions.stockId, stocks.id))
    .where(eq(decisions.userId, userId))
    .orderBy(desc(decisions.createdAt))
    .limit(3);

  const items: RecentDecision[] = rows.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    name: row.name,
    type: row.type,
    date: row.date,
    rationale: row.rationale,
    qty: row.type === "buy" || row.type === "sell" ? num(row.qty) : null,
    grade: gradeFrom(row.tradeReview),
  }));

  return c.json({ items });
});
