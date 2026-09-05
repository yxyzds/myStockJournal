import type { DecisionType } from "@mystockjournal/shared";
import { db } from "../db";
import { decisions } from "../db/schema";

function todayNyDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function decisionExcerpt(text: string, max = 160) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Record a home-feed action. Buy/sell rows are written by the transaction routes. */
export async function recordDecision(input: {
  userId: string;
  stockId: string;
  type: Extract<DecisionType, "thesis_update" | "fair_value">;
  rationale: string;
}) {
  await db.insert(decisions).values({
    userId: input.userId,
    stockId: input.stockId,
    type: input.type,
    date: todayNyDate(),
    rationale: decisionExcerpt(input.rationale),
  });
}
