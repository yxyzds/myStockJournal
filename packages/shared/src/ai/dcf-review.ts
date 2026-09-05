import { isTradeReviewGrade, type TradeReviewGrade } from "./trade-review";

/** Editable DCF drivers reviewed by AI — FCF margin Y1 is filing-derived and skipped. */
export const DCF_REVIEW_FIELDS = [
  "growthY1_5",
  "growthY6_10",
  "termGrowth",
  "wacc",
  "fcfMarginTerm",
] as const;

export type DcfReviewField = (typeof DCF_REVIEW_FIELDS)[number];

export const DCF_REVIEW_FIELD_LABELS: Record<DcfReviewField, string> = {
  growthY1_5: "Revenue growth Y1–5",
  growthY6_10: "Revenue growth Y6–10",
  termGrowth: "Terminal growth",
  wacc: "WACC",
  fcfMarginTerm: "FCF margin terminal",
};

export type DcfAssumptionReview = {
  grade: TradeReviewGrade;
  comments: Record<DcfReviewField, string>;
  reviewedAt: string;
};

export function isDcfAssumptionReview(value: unknown): value is DcfAssumptionReview {
  if (!value || typeof value !== "object") return false;
  const row = value as { grade?: unknown; comments?: unknown; reviewedAt?: unknown };
  if (!isTradeReviewGrade(row.grade)) return false;
  if (typeof row.reviewedAt !== "string" || !row.reviewedAt) return false;
  if (!row.comments || typeof row.comments !== "object") return false;
  const comments = row.comments as Record<string, unknown>;
  return DCF_REVIEW_FIELDS.every(
    (key) => typeof comments[key] === "string" && comments[key].trim().length > 0,
  );
}
