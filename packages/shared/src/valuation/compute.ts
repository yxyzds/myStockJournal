import type { ValuationMethod } from "../types";
import {
  DRIVER_LIMITS,
  EXPECTED_GROWTH_LIMITS,
  EXPECTED_PE_LIMITS,
  MOS_PERCENT_LIMITS,
  dcfInputsFromAnchors,
  peInputsFromAnchors,
  rdcfInputsFromAnchors,
  type ValuationAnchors,
} from "./anchors";
import { valueDcf, type DcfInputs } from "./dcf";
import { valuePe, type PeInputs } from "./pe";
import { valueRdcf, type RdcfInputs } from "./rdcf";
import {
  isImplementedMethod,
  METHOD_LABELS,
  type ImplementedMethod,
  type ValuationAssumptions,
  type ValuationOutputs,
} from "./model";

/** Bounds for prefetched figures. Money is $M and shares are millions. */
const ANCHOR_LIMITS = {
  ttmRevenue: { min: 0.01, max: 1e7 },
  cash: { min: 0, max: 1e7 },
  debt: { min: 0, max: 1e7 },
  shares: { min: 0.0001, max: 1e6 },
  eps: { min: -1e5, max: 1e5 },
} as const;

export type ValuationContext = {
  currentPrice: number;
  /** First projected year. Discounting runs from here for ten years. */
  startYear: number;
};

type Reader = {
  num: (key: string, label: string, limits: { min: number; max: number }) => number;
  choice: <T extends string>(key: string, label: string, allowed: readonly T[], fallback: T) => T;
  error: () => string | null;
};

/**
 * Reads numeric fields out of untrusted JSON, keeping the first failure.
 * Assumptions arrive both from request bodies and from jsonb columns, so every
 * field is range-checked rather than trusted.
 */
function reader(raw: unknown): Reader {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  let error: string | null = null;

  return {
    num(key, label, limits) {
      if (error) return limits.min;
      const candidate = row[key];
      const value = typeof candidate === "number" ? candidate : Number(candidate);
      if (candidate == null || candidate === "" || !Number.isFinite(value)) {
        error = `${label} is required`;
        return limits.min;
      }
      if (value < limits.min || value > limits.max) {
        error = `${label} must be between ${limits.min} and ${limits.max}`;
        return limits.min;
      }
      return value;
    },
    choice(key, label, allowed, fallback) {
      if (error) return fallback;
      const candidate = row[key];
      if (candidate == null) return fallback;
      if (typeof candidate !== "string" || !allowed.includes(candidate as never)) {
        error = `${label} must be one of ${allowed.join(", ")}`;
        return fallback;
      }
      return candidate as never;
    },
    error() {
      return error;
    },
  };
}

function parseAnchorFields(read: Reader) {
  return {
    ttmRevenue: read.num("ttmRevenue", "TTM revenue", ANCHOR_LIMITS.ttmRevenue),
    cash: read.num("cash", "Cash & investments", ANCHOR_LIMITS.cash),
    debt: read.num("debt", "Total debt", ANCHOR_LIMITS.debt),
    shares: read.num("shares", "Diluted shares", ANCHOR_LIMITS.shares),
  };
}

export function parseDcfInputs(raw: unknown): { value: DcfInputs } | { error: string } {
  // Older saved models predate mosPercent — treat missing as 0.
  const normalized =
    raw && typeof raw === "object"
      ? {
          ...(raw as Record<string, unknown>),
          mosPercent:
            (raw as Record<string, unknown>).mosPercent == null ||
            (raw as Record<string, unknown>).mosPercent === ""
              ? 0
              : (raw as Record<string, unknown>).mosPercent,
        }
      : { mosPercent: 0 };
  const read = reader(normalized);
  const value: DcfInputs = {
    ...parseAnchorFields(read),
    growthY1_5: read.num("growthY1_5", "Revenue growth Y1–5", DRIVER_LIMITS.growthY1_5),
    growthY6_10: read.num("growthY6_10", "Revenue growth Y6–10", DRIVER_LIMITS.growthY6_10),
    termGrowth: read.num("termGrowth", "Terminal growth", DRIVER_LIMITS.termGrowth),
    wacc: read.num("wacc", "WACC", DRIVER_LIMITS.wacc),
    fcfMarginY1: read.num("fcfMarginY1", "FCF margin Y1", DRIVER_LIMITS.fcfMarginY1),
    fcfMarginTerm: read.num("fcfMarginTerm", "FCF margin terminal", DRIVER_LIMITS.fcfMarginTerm),
    mosPercent: read.num("mosPercent", "Margin of safety", MOS_PERCENT_LIMITS),
  };
  const error = read.error();
  return error ? { error } : { value };
}

export function parseRdcfInputs(raw: unknown): { value: RdcfInputs } | { error: string } {
  const read = reader(raw);
  const value: RdcfInputs = {
    ...parseAnchorFields(read),
    growthY6_10: read.num("growthY6_10", "Revenue growth Y6–10", DRIVER_LIMITS.growthY6_10),
    termGrowth: read.num("termGrowth", "Terminal growth", DRIVER_LIMITS.termGrowth),
    wacc: read.num("wacc", "WACC", DRIVER_LIMITS.wacc),
    fcfMarginY1: read.num("fcfMarginY1", "FCF margin Y1", DRIVER_LIMITS.fcfMarginY1),
    fcfMarginTerm: read.num("fcfMarginTerm", "FCF margin terminal", DRIVER_LIMITS.fcfMarginTerm),
  };
  const error = read.error();
  return error ? { error } : { value };
}

export function parsePeInputs(raw: unknown): { value: PeInputs } | { error: string } {
  const read = reader(raw);
  const value: PeInputs = {
    expectedPe: read.num("expectedPe", "Expected P/E", EXPECTED_PE_LIMITS),
    epsBasis: read.choice("epsBasis", "EPS basis", ["ttm", "fwd"] as const, "fwd"),
    ttmEps: read.num("ttmEps", "TTM EPS", ANCHOR_LIMITS.eps),
    fwdEps: read.num("fwdEps", "Forward EPS", ANCHOR_LIMITS.eps),
    expectedGrowth: read.num("expectedGrowth", "Expected growth", EXPECTED_GROWTH_LIMITS),
  };
  const error = read.error();
  return error ? { error } : { value };
}

/**
 * Validate assumptions for a method and run the model. This is the single place
 * that turns a request body or a stored worksheet into outputs.
 */
export function buildValuation(
  method: ValuationMethod,
  rawAssumptions: unknown,
  ctx: ValuationContext,
): { assumptions: ValuationAssumptions; outputs: ValuationOutputs } | { error: string } {
  if (!isImplementedMethod(method)) {
    return { error: `${METHOD_LABELS[method]} is not available yet` };
  }
  if (!Number.isFinite(ctx.currentPrice) || ctx.currentPrice <= 0) {
    return { error: "A current market price is required to value this stock" };
  }

  if (method === "dcf") {
    const parsed = parseDcfInputs(rawAssumptions);
    if ("error" in parsed) return parsed;
    const { rows, bridge } = valueDcf(parsed.value, ctx.currentPrice, ctx.startYear);
    return {
      assumptions: parsed.value,
      outputs: {
        method: "dcf",
        startYear: ctx.startYear,
        currentPrice: ctx.currentPrice,
        fairValue: bridge.fv,
        mosPercent: bridge.mos,
        pvFcfs: bridge.pvFcfs,
        tv: bridge.tv,
        pvTv: bridge.pvTv,
        ev: bridge.ev,
        equity: bridge.equity,
        rows,
      },
    };
  }

  if (method === "rdcf") {
    const parsed = parseRdcfInputs(rawAssumptions);
    if ("error" in parsed) return parsed;
    const result = valueRdcf(parsed.value, ctx.currentPrice, ctx.startYear);
    return {
      assumptions: parsed.value,
      outputs: {
        method: "rdcf",
        startYear: ctx.startYear,
        currentPrice: ctx.currentPrice,
        fairValue: null,
        impliedGrowthY1_5: result.impliedGrowthY1_5,
        marketCap: result.marketCap,
        targetEv: result.targetEv,
        pvFcfs: result.pvFcfs,
        tv: result.tv,
        pvTv: result.pvTv,
        ev: result.ev,
        rows: result.rows,
      },
    };
  }

  const parsed = parsePeInputs(rawAssumptions);
  if ("error" in parsed) return parsed;
  const result = valuePe(parsed.value, ctx.currentPrice);
  return {
    assumptions: parsed.value,
    outputs: {
      method: "pe",
      startYear: ctx.startYear,
      currentPrice: ctx.currentPrice,
      fairValue: result.fairValue,
      mosPercent: result.mos,
      eps: result.eps,
      currentPe: result.currentPe,
      currentPeg: result.currentPeg,
      pegAtExpectedPe: result.pegAtExpectedPe,
      impliedPeAtPeg1: result.impliedPeAtPeg1,
      impliedPeAtPeg2: result.impliedPeAtPeg2,
    },
  };
}

/** Starting assumptions when the user opens a method for the first time. */
export function defaultAssumptions(
  method: ImplementedMethod,
  anchors: ValuationAnchors,
): ValuationAssumptions {
  if (method === "dcf") return dcfInputsFromAnchors(anchors);
  if (method === "rdcf") return rdcfInputsFromAnchors(anchors);
  // Start blank — user picks a multiple (history avg / peers / judgment) before the chart plots.
  return peInputsFromAnchors(anchors, 0);
}

/**
 * Read the fair value out of a stored outputs blob, which arrives from jsonb as
 * `unknown`. Null when the method has no fair value (reverse DCF) or the model
 * produced an unusable one.
 */
export function fairValueFromOutputs(outputs: unknown): number | null {
  if (!outputs || typeof outputs !== "object") return null;
  const value = (outputs as { fairValue?: unknown }).fairValue;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** The number a method contributes to "My Fair Value", or null when it has none. */
export function fairValueOf(outputs: ValuationOutputs): number | null {
  return fairValueFromOutputs(outputs);
}
