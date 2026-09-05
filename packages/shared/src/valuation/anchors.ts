import type { DcfInputs } from "./dcf";
import type { PeInputs, PePoint } from "./pe";
import type { RdcfInputs } from "./rdcf";

/** The six drivers the user edits. Everything else in a DCF is an anchor. */
export type DcfDrivers = Pick<
  DcfInputs,
  "growthY1_5" | "growthY6_10" | "termGrowth" | "wacc" | "fcfMarginY1" | "fcfMarginTerm"
>;

/** A filing the anchors were read out of, so the user can check the source. */
export type FilingRef = {
  /** Form type as EDGAR labels it, e.g. "10-K" or "10-Q". */
  form: string;
  /** Date the filing reached EDGAR (YYYY-MM-DD). */
  filingDate: string;
  /** Last day of the period the filing covers (YYYY-MM-DD). */
  reportDate: string;
  url: string;
};

/**
 * Prefetched company figures a valuation starts from. Money is in $M and share
 * counts in millions, matching how filings report them.
 */
export type ValuationAnchors = {
  /** False when no source had figures for this ticker — the UI must let the user enter them. */
  available: boolean;
  /** Period the statement figures cover, e.g. "TTM Q2 FY2026". */
  period: string | null;
  /** Filings these figures came from, newest first. Empty when the source had no links. */
  sourceFilings: FilingRef[];
  ttmRevenue: number;
  cash: number;
  debt: number;
  shares: number;
  /** Historical context only — never feeds the model. */
  past5YCagr: number | null;
  ttmEps: number | null;
  fwdEps: number | null;
  peHistory: PePoint[];
  /** Starting point for the editable drivers, from the vendor or an AI estimate. */
  drivers: DcfDrivers;
  /**
   * True when `drivers.fcfMarginY1` was computed from filings
   * ((TTM OCF − CapEx) / TTM revenue). The UI locks that field and the server
   * overwrites it on save.
   */
  fcfMarginY1FromFilings: boolean;
};

export type DcfScenario = "bear" | "base" | "bull";

/**
 * Scenario multipliers applied to the base drivers. These reproduce the bear and
 * bull cases in the design spec when the base case is (20, 12, 4, 9, 25, 33).
 */
const SCENARIO_FACTORS: Record<DcfScenario, DcfDrivers> = {
  bear: {
    growthY1_5: 0.6,
    growthY6_10: 0.583,
    termGrowth: 0.75,
    wacc: 1.222,
    fcfMarginY1: 0.84,
    fcfMarginTerm: 0.818,
  },
  base: {
    growthY1_5: 1,
    growthY6_10: 1,
    termGrowth: 1,
    wacc: 1,
    fcfMarginY1: 1,
    fcfMarginTerm: 1,
  },
  bull: {
    growthY1_5: 1.4,
    growthY6_10: 1.333,
    termGrowth: 1.25,
    wacc: 0.833,
    fcfMarginY1: 1.12,
    fcfMarginTerm: 1.182,
  },
};

/** Editable ranges, shared by the input widgets and the server-side parser. */
export const DRIVER_LIMITS: Record<keyof DcfDrivers, { min: number; max: number; step: number }> = {
  growthY1_5: { min: 0, max: 60, step: 0.5 },
  growthY6_10: { min: 0, max: 40, step: 0.5 },
  termGrowth: { min: 0, max: 6, step: 0.1 },
  wacc: { min: 4, max: 20, step: 0.1 },
  fcfMarginY1: { min: 0, max: 80, step: 0.5 },
  fcfMarginTerm: { min: 0, max: 80, step: 0.5 },
};

export const EXPECTED_PE_LIMITS = { min: 0, max: 200, step: 0.5 };
export const EXPECTED_GROWTH_LIMITS = { min: 0.1, max: 100, step: 0.5 };
/** Haircut applied to DCF intrinsic value to produce fair value. */
export const MOS_PERCENT_LIMITS = { min: 0, max: 90, step: 1 };

function clampDriver(key: keyof DcfDrivers, value: number) {
  const { min, max } = DRIVER_LIMITS[key];
  return Math.min(max, Math.max(min, value));
}

export function dcfInputsFromAnchors(anchors: ValuationAnchors, drivers?: DcfDrivers): DcfInputs {
  const d = drivers ?? anchors.drivers;
  return {
    ttmRevenue: anchors.ttmRevenue,
    cash: anchors.cash,
    debt: anchors.debt,
    shares: anchors.shares,
    growthY1_5: d.growthY1_5,
    growthY6_10: d.growthY6_10,
    termGrowth: d.termGrowth,
    wacc: d.wacc,
    fcfMarginY1: d.fcfMarginY1,
    fcfMarginTerm: d.fcfMarginTerm,
    mosPercent: 0,
  };
}

/**
 * Scale the base drivers into a bear/base/bull case. Terminal growth is kept
 * below WACC so the Gordon-growth terminal value stays finite.
 */
export function scenarioDrivers(base: DcfDrivers, scenario: DcfScenario): DcfDrivers {
  const factors = SCENARIO_FACTORS[scenario];
  const scaled = {
    growthY1_5: clampDriver("growthY1_5", round1(base.growthY1_5 * factors.growthY1_5)),
    growthY6_10: clampDriver("growthY6_10", round1(base.growthY6_10 * factors.growthY6_10)),
    termGrowth: clampDriver("termGrowth", round1(base.termGrowth * factors.termGrowth)),
    wacc: clampDriver("wacc", round1(base.wacc * factors.wacc)),
    fcfMarginY1: clampDriver("fcfMarginY1", round1(base.fcfMarginY1 * factors.fcfMarginY1)),
    fcfMarginTerm: clampDriver("fcfMarginTerm", round1(base.fcfMarginTerm * factors.fcfMarginTerm)),
  };
  if (scaled.termGrowth >= scaled.wacc) {
    scaled.termGrowth = clampDriver("termGrowth", round1(scaled.wacc - 1));
  }
  return scaled;
}

export function rdcfInputsFromAnchors(
  anchors: ValuationAnchors,
  drivers?: DcfDrivers,
): RdcfInputs {
  const d = drivers ?? anchors.drivers;
  return {
    ttmRevenue: anchors.ttmRevenue,
    cash: anchors.cash,
    debt: anchors.debt,
    shares: anchors.shares,
    wacc: d.wacc,
    termGrowth: d.termGrowth,
    fcfMarginY1: d.fcfMarginY1,
    fcfMarginTerm: d.fcfMarginTerm,
    growthY6_10: d.growthY6_10,
  };
}

export function peInputsFromAnchors(anchors: ValuationAnchors, expectedPe: number): PeInputs {
  return {
    expectedPe,
    epsBasis: anchors.fwdEps != null ? "fwd" : "ttm",
    ttmEps: anchors.ttmEps ?? 0,
    fwdEps: anchors.fwdEps ?? anchors.ttmEps ?? 0,
    expectedGrowth: 10,
  };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
