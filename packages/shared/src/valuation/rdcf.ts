import { calcDcfBridge, calcDcfRows, type DcfInputs, type DcfYearRow } from "./dcf";

/**
 * A reverse DCF holds every driver fixed except Y1–5 revenue growth, then asks
 * which growth rate makes the model reconcile to the current market price.
 */
export type RdcfInputs = {
  ttmRevenue: number;
  cash: number;
  debt: number;
  shares: number;
  wacc: number;
  termGrowth: number;
  fcfMarginY1: number;
  fcfMarginTerm: number;
  /** Y6–10 growth is a stated rule here, not the solved variable. */
  growthY6_10: number;
};

export type RdcfResult = {
  /** Solved Y1–5 revenue CAGR, or null when the model cannot converge. */
  impliedGrowthY1_5: number | null;
  marketCap: number;
  targetEv: number;
  rows: DcfYearRow[];
  pvFcfs: number;
  tv: number;
  pvTv: number;
  ev: number;
};

/** Bisection bounds, in percent. Wide enough to bracket anything a real price implies. */
const GROWTH_LO = -20;
const GROWTH_HI = 150;
const MAX_ITERATIONS = 80;
const TOLERANCE = 0.001;

export function rdcfToDcfInputs(inp: RdcfInputs, growthY1_5: number): DcfInputs {
  return {
    ttmRevenue: inp.ttmRevenue,
    growthY1_5,
    growthY6_10: inp.growthY6_10,
    termGrowth: inp.termGrowth,
    wacc: inp.wacc,
    fcfMarginY1: inp.fcfMarginY1,
    fcfMarginTerm: inp.fcfMarginTerm,
    cash: inp.cash,
    debt: inp.debt,
    shares: inp.shares,
  };
}

/** Enterprise value the market is paying for: market cap, less cash, plus debt. */
export function targetEvFromPrice(inp: RdcfInputs, currentPrice: number) {
  return currentPrice * inp.shares - inp.cash + inp.debt;
}

function evAtGrowth(inp: RdcfInputs, growthY1_5: number, startYear: number) {
  const dcf = rdcfToDcfInputs(inp, growthY1_5);
  const rows = calcDcfRows(dcf, startYear);
  return calcDcfBridge(dcf, rows, 1).ev;
}

/**
 * Solve for the Y1–5 revenue CAGR that reconciles PV(FCFs) + PV(TV) to the
 * market-implied EV. EV rises monotonically with growth, so bisection is safe.
 */
export function solveImpliedGrowth(
  inp: RdcfInputs,
  currentPrice: number,
  startYear = 2026,
): number | null {
  if (inp.wacc <= inp.termGrowth || inp.shares <= 0 || inp.ttmRevenue <= 0) return null;

  const targetEv = targetEvFromPrice(inp, currentPrice);
  if (!Number.isFinite(targetEv) || targetEv <= 0) return null;

  // A price outside the bracket has no plausible solution — say so rather than clamp.
  if (evAtGrowth(inp, GROWTH_LO, startYear) > targetEv) return null;
  if (evAtGrowth(inp, GROWTH_HI, startYear) < targetEv) return null;

  let lo = GROWTH_LO;
  let hi = GROWTH_HI;
  let mid = 0;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    mid = (lo + hi) / 2;
    if (evAtGrowth(inp, mid, startYear) < targetEv) lo = mid;
    else hi = mid;
    if (hi - lo < TOLERANCE) break;
  }
  return mid;
}

/** Solve for implied growth, then rebuild the 10-year path that growth produces. */
export function valueRdcf(
  inp: RdcfInputs,
  currentPrice: number,
  startYear = 2026,
): RdcfResult {
  const marketCap = currentPrice * inp.shares;
  const targetEv = targetEvFromPrice(inp, currentPrice);
  const impliedGrowthY1_5 = solveImpliedGrowth(inp, currentPrice, startYear);

  if (impliedGrowthY1_5 == null) {
    return { impliedGrowthY1_5: null, marketCap, targetEv, rows: [], pvFcfs: 0, tv: 0, pvTv: 0, ev: 0 };
  }

  const dcf = rdcfToDcfInputs(inp, impliedGrowthY1_5);
  const rows = calcDcfRows(dcf, startYear);
  const bridge = calcDcfBridge(dcf, rows, currentPrice);

  return {
    impliedGrowthY1_5,
    marketCap,
    targetEv,
    rows,
    pvFcfs: bridge.pvFcfs,
    tv: bridge.tv,
    pvTv: bridge.pvTv,
    ev: bridge.ev,
  };
}
