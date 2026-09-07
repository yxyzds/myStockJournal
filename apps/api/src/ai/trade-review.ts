import {
  isTradeReviewGrade,
  TRADE_REVIEW_GRADES,
  type JournalEntry,
  type StockTransaction,
  type TradeReview,
  type TradeReviewGrade,
} from "@mystockjournal/shared";
import { chatJson } from "./chat";

/** Recorded fill vs the session close: outside this band is almost certainly a typo. */
const PRICE_LOW_RATIO = 0.4;
const PRICE_HIGH_RATIO = 2.5;
/** Wider miss (missing zero / extra zero) → harder roast. */
const PRICE_EXTREME_LOW = 0.2;
const PRICE_EXTREME_HIGH = 5;
const MAX_CLOSE_GAP_DAYS = 7;
const RECENT_TRADE_DAYS = 10;

const GRADE_RANK: Record<TradeReviewGrade, number> = {
  Clownery: 0,
  Copeium: 1,
  Midtake: 2,
  Based: 3,
  Oracle: 4,
};

export type SessionClose = {
  date: string;
  close: number;
};

export type PriceSanityFlag = {
  type: "buy" | "sell";
  date: string;
  recordedPrice: number | null;
  referencePrice: number | null;
  ratio: number | null;
  reason: "missing" | "non_positive" | "far_from_session";
  extreme: boolean;
};

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
- FIRST check priceSanity. If status is "implausible", the blurb MUST challenge the recorded fill (typo, extra/missing zeros, wrong decimal, missing price). Do not treat that number as a real trade. Grade Clownery or Copeium. Do not praise the thesis until the price is believable.
- If priceSanity.status is "ok", ignore that section and judge the writing and reasoning — not whether the stock went up.
- If priceSanity.status is "unchecked", skip the price question.
- blurb must be English. No markdown. No emoji.
- Do not invent facts that are not in the notes or priceSanity payload.`;

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

function todayNyDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function calendarDaysBetween(from: string, to: string) {
  const a = Date.parse(`${from}T12:00:00`);
  const b = Date.parse(`${to}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function closeOnOrBefore(date: string, closes: SessionClose[], maxGapDays: number) {
  let best: SessionClose | null = null;
  for (const bar of closes) {
    if (!(bar.close > 0) || bar.date > date) continue;
    if (!best || bar.date > best.date) best = bar;
  }
  if (!best) return null;
  const gap = calendarDaysBetween(best.date, date);
  if (gap == null || gap > maxGapDays) return null;
  return best.close;
}

function money(value: number) {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(2).replace(/\.?0+$/, "") || value.toFixed(2);
  return value.toPrecision(3);
}

function snapshotPriceByDate(journal: JournalEntry[]) {
  const map = new Map<string, number>();
  for (const entry of journal) {
    const price = entry.snapshot?.price;
    if (price != null && price > 0) map.set(entry.date, price);
  }
  return map;
}

function referenceForTrade(input: {
  date: string;
  sessionCloses: SessionClose[];
  snapshotByDate: Map<string, number>;
  lastClose: number | null;
  today: string;
}): number | null {
  const session = closeOnOrBefore(input.date, input.sessionCloses, MAX_CLOSE_GAP_DAYS);
  if (session != null) return session;
  const snapshot = input.snapshotByDate.get(input.date);
  if (snapshot != null) return snapshot;
  const last = input.lastClose;
  if (last == null || !(last > 0)) return null;
  const age = calendarDaysBetween(input.date, input.today);
  if (age == null || age < 0 || age > RECENT_TRADE_DAYS) return null;
  return last;
}

export function flagImplausibleTradePrices(input: {
  transactions: StockTransaction[];
  journal: JournalEntry[];
  sessionCloses: SessionClose[];
  lastClose: number | null;
  today?: string;
}): PriceSanityFlag[] {
  const today = input.today ?? todayNyDate();
  const snapshotByDate = snapshotPriceByDate(input.journal);
  const flags: PriceSanityFlag[] = [];

  for (const txn of input.transactions) {
    if (txn.price == null) {
      flags.push({
        type: txn.type,
        date: txn.date,
        recordedPrice: null,
        referencePrice: referenceForTrade({
          date: txn.date,
          sessionCloses: input.sessionCloses,
          snapshotByDate,
          lastClose: input.lastClose,
          today,
        }),
        ratio: null,
        reason: "missing",
        extreme: true,
      });
      continue;
    }

    if (!(txn.price > 0)) {
      flags.push({
        type: txn.type,
        date: txn.date,
        recordedPrice: txn.price,
        referencePrice: null,
        ratio: null,
        reason: "non_positive",
        extreme: true,
      });
      continue;
    }

    const reference = referenceForTrade({
      date: txn.date,
      sessionCloses: input.sessionCloses,
      snapshotByDate,
      lastClose: input.lastClose,
      today,
    });
    if (reference == null) continue;

    const ratio = txn.price / reference;
    if (ratio >= PRICE_LOW_RATIO && ratio <= PRICE_HIGH_RATIO) continue;

    flags.push({
      type: txn.type,
      date: txn.date,
      recordedPrice: txn.price,
      referencePrice: reference,
      ratio,
      reason: "far_from_session",
      extreme: ratio < PRICE_EXTREME_LOW || ratio > PRICE_EXTREME_HIGH,
    });
  }

  return flags;
}

function capGrade(grade: TradeReviewGrade, flags: PriceSanityFlag[]): TradeReviewGrade {
  if (flags.length === 0) return grade;
  const cap: TradeReviewGrade = flags.some((flag) => flag.extreme) ? "Clownery" : "Copeium";
  return GRADE_RANK[grade] > GRADE_RANK[cap] ? cap : grade;
}

function blurbChallengesPrice(blurb: string) {
  return /\b(price|priced|typ(o|os)|zeroes?|zeros?|decimal|fill|misprint|wrong number|ghost|implausible|\$\s*\d)/i.test(
    blurb,
  );
}

function fallbackBlurb(ticker: string, flags: PriceSanityFlag[]): string {
  const flag = flags.find((row) => row.extreme) ?? flags[0];
  if (!flag) return `Those ${ticker} fills do not match the tape. Fix the prices before I grade the diary.`;
  if (flag.reason === "missing") {
    return `You booked a ${flag.type} on ${flag.date} with no fill price. I am not grading a ghost trade.`;
  }
  if (flag.reason === "non_positive") {
    return `$${flag.recordedPrice} is not a real ${ticker} fill. Fix the number, then we can talk thesis.`;
  }
  const recorded = flag.recordedPrice != null ? money(flag.recordedPrice) : "?";
  const reference = flag.referencePrice != null ? money(flag.referencePrice) : "?";
  return `${ticker} at $${recorded} on ${flag.date}? The session was around $${reference}. Typo, extra zero, or a different stock?`;
}

export async function reviewTradeJournal(input: {
  ticker: string;
  name: string;
  journal: JournalEntry[];
  transactions: StockTransaction[];
  lastClose?: number | null;
  sessionCloses?: SessionClose[];
}): Promise<TradeReview> {
  const lastClose = input.lastClose ?? null;
  const sessionCloses = input.sessionCloses ?? [];
  const flags = flagImplausibleTradePrices({
    transactions: input.transactions,
    journal: input.journal,
    sessionCloses,
    lastClose,
  });
  const priceStatus = flags.length > 0 ? "implausible" : lastClose != null || sessionCloses.length > 0 ? "ok" : "unchecked";

  const raw = await chatJson([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: JSON.stringify({
        ticker: input.ticker,
        name: input.name,
        lastClose,
        journal: compactJournal(input.journal),
        transactions: compactTxns(input.transactions),
        priceSanity: {
          status: priceStatus,
          rule: "A recorded fill is implausible if it is missing, not positive, or outside 0.4x–2.5x the session close on that date (typos / extra zeros). Historical buys that simply aged well are NOT implausible.",
          flags,
        },
      }),
    },
  ]);

  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawGrade = row.grade;
  let blurb = typeof row.blurb === "string" ? row.blurb.trim() : "";

  if (!isTradeReviewGrade(rawGrade)) {
    throw new Error("AI returned an invalid grade");
  }
  if (!blurb) throw new Error("AI returned an empty blurb");

  let grade: TradeReviewGrade = rawGrade;
  if (flags.length > 0) {
    grade = capGrade(grade, flags);
    if (!blurbChallengesPrice(blurb)) {
      blurb = fallbackBlurb(input.ticker, flags);
    }
  }

  return {
    grade,
    blurb: blurb.slice(0, 280),
    reviewedAt: new Date().toISOString(),
  };
}
