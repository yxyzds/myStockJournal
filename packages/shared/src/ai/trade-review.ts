/** Five tongue-in-cheek grades, worst → best. */
export const TRADE_REVIEW_GRADES = [
  "Clownery",
  "Copeium",
  "Midtake",
  "Based",
  "Oracle",
] as const;

export type TradeReviewGrade = (typeof TRADE_REVIEW_GRADES)[number];

export function isTradeReviewGrade(value: unknown): value is TradeReviewGrade {
  return typeof value === "string" && (TRADE_REVIEW_GRADES as readonly string[]).includes(value);
}

export const TRADE_THESIS_GRADES = ["weak", "ok", "strong"] as const;
export type TradeThesisGrade = (typeof TRADE_THESIS_GRADES)[number];

export const TRADE_EXECUTIONS = [
  "per_plan",
  "early_exit",
  "delayed_stop",
  "impulse",
  "unplanned_add",
  "unclear",
] as const;
export type TradeExecution = (typeof TRADE_EXECUTIONS)[number];

export const TRADE_PROCESS_OUTCOMES = [
  "good_process_good_result",
  "good_process_bad_result",
  "lucky_win",
  "deserved_loss",
  "unknown",
] as const;
export type TradeProcessOutcome = (typeof TRADE_PROCESS_OUTCOMES)[number];

export const TRADE_REVIEW_GAPS = ["invalidation", "evidence", "plan", "sizing"] as const;
export type TradeReviewGap = (typeof TRADE_REVIEW_GAPS)[number];

function isIn<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function isTradeThesisGrade(value: unknown): value is TradeThesisGrade {
  return isIn(value, TRADE_THESIS_GRADES);
}

export function isTradeExecution(value: unknown): value is TradeExecution {
  return isIn(value, TRADE_EXECUTIONS);
}

export function isTradeProcessOutcome(value: unknown): value is TradeProcessOutcome {
  return isIn(value, TRADE_PROCESS_OUTCOMES);
}

export function isTradeReviewGap(value: unknown): value is TradeReviewGap {
  return isIn(value, TRADE_REVIEW_GAPS);
}

export type TradeReviewTags = {
  thesis: TradeThesisGrade | null;
  execution: TradeExecution | null;
  processVsOutcome: TradeProcessOutcome | null;
  missing: TradeReviewGap[];
};

/** Forced tags when recorded fills are not believable — do not score the thesis. */
export const PRICE_SANITY_REVIEW_TAGS: TradeReviewTags = {
  thesis: "weak",
  execution: "unclear",
  processVsOutcome: "unknown",
  missing: [],
};

export function parseTradeReviewGaps(value: unknown): TradeReviewGap[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<TradeReviewGap>();
  for (const item of value) {
    if (isTradeReviewGap(item)) seen.add(item);
  }
  return [...seen];
}

export function parseTradeReviewTags(value: unknown): TradeReviewTags {
  if (!value || typeof value !== "object") {
    return { thesis: null, execution: null, processVsOutcome: null, missing: [] };
  }
  const row = value as Record<string, unknown>;
  return {
    thesis: isTradeThesisGrade(row.thesis) ? row.thesis : null,
    execution: isTradeExecution(row.execution) ? row.execution : null,
    processVsOutcome: isTradeProcessOutcome(row.processVsOutcome) ? row.processVsOutcome : null,
    missing: parseTradeReviewGaps(row.missing),
  };
}

/** Structured AI judgment of a ticker's journal (and trades). */
export type TradeReview = {
  grade: TradeReviewGrade;
  /** One punchy sentence — dry humor welcome. */
  blurb: string;
  reviewedAt: string;
  /** Null on reviews saved before structured tags existed. */
  thesis: TradeThesisGrade | null;
  execution: TradeExecution | null;
  processVsOutcome: TradeProcessOutcome | null;
  missing: TradeReviewGap[];
};

/** jsonb round-trip: old rows only have grade / blurb / reviewedAt. */
export function parseTradeReview(value: unknown): TradeReview | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isTradeReviewGrade(row.grade)) return null;
  if (typeof row.blurb !== "string" || !row.blurb.trim()) return null;
  if (typeof row.reviewedAt !== "string" || !row.reviewedAt) return null;
  return {
    grade: row.grade,
    blurb: row.blurb,
    reviewedAt: row.reviewedAt,
    ...parseTradeReviewTags(row),
  };
}
