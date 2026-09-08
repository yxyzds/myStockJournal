import {
  isTradeReviewGrade,
  TRADE_REVIEW_GRADES,
  type JournalEntry,
  type StockTransaction,
  type TradeReview,
  type TradeReviewGrade,
} from "@mystockjournal/shared";
import { reviewLanguageName, type AppLocale } from "../lib/locale";
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

function systemPrompt(language: AppLocale) {
  const blurbLang = reviewLanguageName(language);
  return `You are a witty, slightly roasting trading coach for a personal stock journal app.
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
{ "grade": "<one of the five grades>", "blurb": "<one punchy sentence, max ~140 chars, dry humor OK>" }

Rules:
- FIRST check priceSanity. If status is "implausible", the blurb MUST challenge the recorded fill (typo, extra/missing zeros, wrong decimal, missing price). Do not treat that number as a real trade. Grade Clownery or Copeium. Do not praise the thesis until the price is believable.
- If priceSanity.status is "ok", ignore that section and judge the writing and reasoning — not whether the stock went up.
- If priceSanity.status is "unchecked", skip the price question.
- blurb must be ${blurbLang}. No markdown. No emoji.
- Do not invent facts that are not in the notes or priceSanity payload.`;
}

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
  return /\b(price|priced|typ(o|os)|zeroes?|zeros?|decimal|fill|misprint|wrong number|ghost|implausible|\$\s*\d)|价格|價格|成交|笔误|筆誤|ゼロ|価格|誤記|桁/i.test(
    blurb,
  );
}

function fallbackBlurb(ticker: string, flags: PriceSanityFlag[], language: AppLocale): string {
  const flag = flags.find((row) => row.extreme) ?? flags[0];
  const buySellZh = flag?.type === "buy" ? "买入" : "卖出";
  const buySellHant = flag?.type === "buy" ? "買入" : "賣出";
  const buySellJa = flag?.type === "buy" ? "買い" : "売り";
  const recorded = flag?.recordedPrice != null ? money(flag.recordedPrice) : "?";
  const reference = flag?.referencePrice != null ? money(flag.referencePrice) : "?";

  if (language === "zh") {
    if (!flag) return `这些 ${ticker} 成交价对不上行情。先改价格，再评日记。`;
    if (flag.reason === "missing") {
      return `你在 ${flag.date} 记了一笔${buySellZh}，却没有成交价。空单没法评。`;
    }
    if (flag.reason === "non_positive") {
      return `$${flag.recordedPrice} 不是一笔真实的 ${ticker} 成交。先改数字，再谈论点。`;
    }
    return `${ticker} 在 ${flag.date} 记成 $${recorded}？当日行情大约 $${reference}。笔误、多写零，还是另一只股票？`;
  }
  if (language === "zh-TW") {
    if (!flag) return `這些 ${ticker} 成交價對不上行情。先改價格，再評日記。`;
    if (flag.reason === "missing") {
      return `你在 ${flag.date} 記了一筆${buySellHant}，卻沒有成交價。空單沒法評。`;
    }
    if (flag.reason === "non_positive") {
      return `$${flag.recordedPrice} 不是一筆真實的 ${ticker} 成交。先改數字，再談論點。`;
    }
    return `${ticker} 在 ${flag.date} 記成 $${recorded}？當日行情大約 $${reference}。筆誤、多寫零，還是另一檔股票？`;
  }
  if (language === "ja") {
    if (!flag) return `これらの ${ticker} 約定は相場と合いません。価格を直してから日記を採点します。`;
    if (flag.reason === "missing") {
      return `${flag.date} の${buySellJa}に約定価格がありません。幽霊トレードは採点できません。`;
    }
    if (flag.reason === "non_positive") {
      return `$${flag.recordedPrice} は実在する ${ticker} の約定ではありません。数字を直してから論点を話しましょう。`;
    }
    return `${ticker} を ${flag.date} に $${recorded}？当日の相場は約 $${reference}。誤記、ゼロの付け忘れ、別銘柄？`;
  }
  if (!flag) return `Those ${ticker} fills do not match the tape. Fix the prices before I grade the diary.`;
  if (flag.reason === "missing") {
    return `You booked a ${flag.type} on ${flag.date} with no fill price. I am not grading a ghost trade.`;
  }
  if (flag.reason === "non_positive") {
    return `$${flag.recordedPrice} is not a real ${ticker} fill. Fix the number, then we can talk thesis.`;
  }
  return `${ticker} at $${recorded} on ${flag.date}? The session was around $${reference}. Typo, extra zero, or a different stock?`;
}

export async function reviewTradeJournal(input: {
  ticker: string;
  name: string;
  journal: JournalEntry[];
  transactions: StockTransaction[];
  lastClose?: number | null;
  sessionCloses?: SessionClose[];
  language?: AppLocale;
}): Promise<TradeReview> {
  const language = input.language ?? "en";
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
    { role: "system", content: systemPrompt(language) },
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
      blurb = fallbackBlurb(input.ticker, flags, language);
    }
  }

  return {
    grade,
    blurb: blurb.slice(0, 280),
    reviewedAt: new Date().toISOString(),
  };
}
