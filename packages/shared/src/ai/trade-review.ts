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
  return (
    typeof value === "string" &&
    (TRADE_REVIEW_GRADES as readonly string[]).includes(value)
  );
}

/** Structured AI judgment of a ticker's journal (and trades). */
export type TradeReview = {
  grade: TradeReviewGrade;
  /** One punchy English sentence — dry humor welcome. */
  blurb: string;
  reviewedAt: string;
};
