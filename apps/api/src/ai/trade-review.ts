import {
  isTradeReviewGrade,
  TRADE_REVIEW_GRADES,
  type JournalEntry,
  type StockTransaction,
  type TradeReview,
} from "@mystockjournal/shared";
import { chatJson } from "./chat";

const SYSTEM = `You are a witty, slightly roasting trading coach for a personal stock journal app.
Read the investor's journal notes (and any recorded buys/sells). Grade the overall quality of their thinking.

Pick exactly ONE grade from this list (worst → best):
${TRADE_REVIEW_GRADES.map((g, i) => `${i + 1}. ${g}`).join("\n")}

Meanings:
- Clownery: chaotic, no thesis, vibes-only
- Copeium: rationalizing a bad take
- Midtake: okay but shallow or generic
- Based: clear thesis, evidence-aware
- Oracle: unusually sharp, falsifiable, disciplined

Respond with JSON only:
{ "grade": "<one of the five grades>", "blurb": "<one punchy English sentence, max ~140 chars, dry humor OK>" }

Rules:
- Judge the writing and reasoning, not whether the stock went up.
- blurb must be English. No markdown. No emoji.
- Do not invent facts that are not in the notes.`;

function compactJournal(entries: JournalEntry[]) {
  return entries.map((entry) => ({
    date: entry.date,
    text: entry.text.slice(0, 1200),
    price: entry.snapshot?.price ?? null,
  }));
}

function compactTxns(txns: StockTransaction[]) {
  return txns.map((txn) => ({
    type: txn.type,
    date: txn.date,
    price: txn.price,
    qty: txn.qty,
    rationale: txn.rationale.slice(0, 600),
  }));
}

export async function reviewTradeJournal(input: {
  ticker: string;
  name: string;
  journal: JournalEntry[];
  transactions: StockTransaction[];
}): Promise<TradeReview> {
  const raw = await chatJson([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: JSON.stringify({
        ticker: input.ticker,
        name: input.name,
        journal: compactJournal(input.journal),
        transactions: compactTxns(input.transactions),
      }),
    },
  ]);

  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const grade = row.grade;
  const blurb = typeof row.blurb === "string" ? row.blurb.trim() : "";

  if (!isTradeReviewGrade(grade)) {
    throw new Error("AI returned an invalid grade");
  }
  if (!blurb) throw new Error("AI returned an empty blurb");

  return {
    grade,
    blurb: blurb.slice(0, 280),
    reviewedAt: new Date().toISOString(),
  };
}
