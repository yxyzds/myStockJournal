import {
  WACC_BUILD_LIMITS,
  type WaccPrefillResponse,
} from "@mystockjournal/shared";
import { reviewLanguageName, type AppLocale } from "../lib/locale";
import { chatJson } from "./chat";

function clamp(value: number, limits: { min: number; max: number }) {
  return Math.min(limits.max, Math.max(limits.min, Math.round(value * 100) / 100));
}

function pickNum(row: Record<string, unknown>, key: string, limits: { min: number; max: number }): number | undefined {
  const n = typeof row[key] === "number" ? row[key] : Number(row[key]);
  if (!Number.isFinite(n)) return undefined;
  return clamp(n, limits);
}

export type WaccPrefillContext = {
  ticker: string;
  name: string;
  currentPrice: number;
  past5YCagr: number | null;
  equity: number;
  debt: number;
  rf: number | null;
  beta: number | null;
  preTaxCostOfDebt: number | null;
  taxRate: number | null;
  missing: Array<"rf" | "beta" | "preTaxCostOfDebt" | "taxRate">;
};

function systemPrompt(language: AppLocale, missing: WaccPrefillContext["missing"]) {
  const lang = reviewLanguageName(language);
  const extra = missing.length > 0 ? `Also fill these missing fetched fields: ${missing.join(", ")}.` : "Do not invent Rf, beta, Rd, or tax — those were fetched.";
  return `You are filling a CAPM WACC worksheet for a US-listed stock.
Respond with JSON only:
{
  "erp": <number>,
  "rf": <number, only if requested>,
  "beta": <number, only if requested>,
  "preTaxCostOfDebt": <number, only if requested>,
  "taxRate": <number, only if requested>,
  "note": "<one ${lang} sentence, max 140 characters>"
}

ERP is the US equity risk premium in percent (typical range 4–6.5). Always fill erp.
${extra}
${lang} only in note. No markdown. No emoji.
Do not invent facts contradicted by the payload.`;
}

const FALLBACK_ERP = 5.5;

export function fallbackWaccPrefill(ctx: WaccPrefillContext): WaccPrefillResponse {
  const out: WaccPrefillResponse = {
    erp: FALLBACK_ERP,
    note: "Used a 5.5% US equity risk premium — edit if you prefer a different ERP.",
  };
  if (ctx.missing.includes("rf")) out.rf = 4.3;
  if (ctx.missing.includes("beta")) out.beta = 1;
  if (ctx.missing.includes("preTaxCostOfDebt")) out.preTaxCostOfDebt = 5;
  if (ctx.missing.includes("taxRate")) out.taxRate = 21;
  return out;
}

export async function prefillWaccAssumptions(
  ctx: WaccPrefillContext,
  language: AppLocale,
): Promise<WaccPrefillResponse> {
  const raw = await chatJson([
    { role: "system", content: systemPrompt(language, ctx.missing) },
    { role: "user", content: JSON.stringify(ctx) },
  ]);
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const erp = pickNum(row, "erp", WACC_BUILD_LIMITS.erp) ?? FALLBACK_ERP;
  const note = typeof row.note === "string" && row.note.trim() ? row.note.trim().slice(0, 220) : "";
  const out: WaccPrefillResponse = { erp, note: note || fallbackWaccPrefill(ctx).note };
  if (ctx.missing.includes("rf")) {
    out.rf = pickNum(row, "rf", WACC_BUILD_LIMITS.rf) ?? 4.3;
  }
  if (ctx.missing.includes("beta")) {
    out.beta = pickNum(row, "beta", WACC_BUILD_LIMITS.beta) ?? 1;
  }
  if (ctx.missing.includes("preTaxCostOfDebt")) {
    out.preTaxCostOfDebt = pickNum(row, "preTaxCostOfDebt", WACC_BUILD_LIMITS.preTaxCostOfDebt) ?? 5;
  }
  if (ctx.missing.includes("taxRate")) {
    out.taxRate = pickNum(row, "taxRate", WACC_BUILD_LIMITS.taxRate) ?? 21;
  }
  return out;
}
