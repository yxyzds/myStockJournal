import {
  DCF_REVIEW_FIELD_LABELS,
  DCF_REVIEW_FIELDS,
  isTradeReviewGrade,
  TRADE_REVIEW_GRADES,
  type DcfAssumptionReview,
  type DcfInputs,
  type DcfReviewField,
  type ValuationAnchors,
} from "@mystockjournal/shared";
import { chatJson } from "./chat";

const SYSTEM = `You are a sharp valuation coach reviewing a user's DCF assumptions.
Judge whether each driver is internally consistent and grounded in the provided anchors. Do not decide if the stock is a buy.

Respond with JSON only:
{
  "grade": <one of: ${TRADE_REVIEW_GRADES.join(" | ")}>,
  "comments": {
    "growthY1_5": "<one English sentence>",
    "growthY6_10": "<one English sentence>",
    "termGrowth": "<one English sentence>",
    "wacc": "<one English sentence>",
    "fcfMarginTerm": "<one English sentence>"
  }
}

Grade meanings (worst → best): Clownery, Copeium, Midtake, Based, Oracle.
Grade the overall quality of these drivers as a set.

Rules:
- Exactly one sentence per comment. Max ~140 characters each.
- Cover these fields only: ${DCF_REVIEW_FIELDS.map((key) => DCF_REVIEW_FIELD_LABELS[key]).join(", ")}.
- Do not review FCF margin Y1 — it comes from filings and is locked.
- Compare each driver to the anchors / past 5Y CAGR when provided.
- English only. No markdown. No emoji.
- Do not invent facts that are not in the payload.`;

export async function reviewDcfAssumptions(input: {
  ticker: string;
  name: string;
  assumptions: DcfInputs;
  anchors: ValuationAnchors;
  currentPrice: number;
}): Promise<DcfAssumptionReview> {
  const raw = await chatJson([
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: JSON.stringify({
        ticker: input.ticker,
        name: input.name,
        currentPrice: input.currentPrice,
        drivers: {
          growthY1_5: input.assumptions.growthY1_5,
          growthY6_10: input.assumptions.growthY6_10,
          termGrowth: input.assumptions.termGrowth,
          wacc: input.assumptions.wacc,
          fcfMarginTerm: input.assumptions.fcfMarginTerm,
        },
        skipped: {
          fcfMarginY1: input.assumptions.fcfMarginY1,
          reason: "Filing-derived / locked — do not review",
        },
        anchors: {
          available: input.anchors.available,
          past5YCagr: input.anchors.past5YCagr,
          referenceDrivers: input.anchors.drivers,
        },
      }),
    },
  ]);

  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!isTradeReviewGrade(row.grade)) throw new Error("AI returned an invalid grade");

  const rawComments =
    row.comments && typeof row.comments === "object"
      ? (row.comments as Record<string, unknown>)
      : {};
  const comments = {} as Record<DcfReviewField, string>;
  for (const key of DCF_REVIEW_FIELDS) {
    const text = typeof rawComments[key] === "string" ? rawComments[key].trim() : "";
    if (!text) throw new Error(`AI returned an empty comment for ${key}`);
    comments[key] = text.slice(0, 220);
  }

  return {
    grade: row.grade,
    comments,
    reviewedAt: new Date().toISOString(),
  };
}
