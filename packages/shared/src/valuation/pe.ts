/** One year of the P/E history behind the chart. `growth` is EPS growth in percent. */
export type PePoint = {
  year: number;
  pe: number;
  growth: number;
};

/** Chart-ready multiple point — yearly or week/month bars from live prices. */
export type PeSeriesPoint = {
  /** Axis label: "2024", "2025-09", "2025-09-12", etc. */
  label: string;
  pe: number;
  /** EPS growth % used for PEG; null when unknown. */
  growth: number | null;
};

export type PeChartPeriod = "week" | "month" | "year";

export type PeInputs = {
  /** The multiple the user is willing to pay. */
  expectedPe: number;
  epsBasis: "ttm" | "fwd";
  ttmEps: number;
  fwdEps: number;
  /** Expected earnings growth in percent — the denominator of the PEG lens. */
  expectedGrowth: number;
};

export type PeResult = {
  eps: number;
  fairValue: number;
  mos: number;
  /** What the market pays today, on the same EPS basis the fair value uses. */
  currentPe: number | null;
  /** PEG figures are null when growth or EPS is non-positive, where PEG is meaningless. */
  currentPeg: number | null;
  pegAtExpectedPe: number | null;
  impliedPeAtPeg1: number | null;
  impliedPeAtPeg2: number | null;
};

export function epsFor(inp: PeInputs) {
  return inp.epsBasis === "ttm" ? inp.ttmEps : inp.fwdEps;
}

/** PEG only carries meaning for a profitable company that is growing. */
function pegIsMeaningful(eps: number, growth: number) {
  return eps > 0 && growth > 0;
}

export function valuePe(inp: PeInputs, currentPrice: number): PeResult {
  const eps = epsFor(inp);
  const fairValue = inp.expectedPe * eps;
  const mos = currentPrice > 0 ? ((fairValue - currentPrice) / currentPrice) * 100 : 0;
  // Derived from the live price so the multiple can never disagree with the fair value.
  const currentPe = eps > 0 && currentPrice > 0 ? currentPrice / eps : null;

  if (!pegIsMeaningful(eps, inp.expectedGrowth)) {
    return {
      eps,
      fairValue,
      mos,
      currentPe,
      currentPeg: null,
      pegAtExpectedPe: null,
      impliedPeAtPeg1: null,
      impliedPeAtPeg2: null,
    };
  }

  return {
    eps,
    fairValue,
    mos,
    currentPe,
    currentPeg: currentPe == null ? null : currentPe / inp.expectedGrowth,
    pegAtExpectedPe: inp.expectedPe / inp.expectedGrowth,
    impliedPeAtPeg1: inp.expectedGrowth,
    impliedPeAtPeg2: 2 * inp.expectedGrowth,
  };
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Average P/E over the `years` most recent *completed* years.
 * The latest point is the current multiple, so it is excluded from the averages.
 */
export function trailingAveragePe(history: PePoint[], years: number): number | null {
  const completed = history.slice(0, -1);
  if (completed.length < years) return null;
  const window = completed.slice(-years);
  return window.reduce((sum, point) => sum + point.pe, 0) / window.length;
}

/** The most recent point in the history is treated as the current multiple. */
export function currentPeFromHistory(history: PePoint[]): number | null {
  return history.length > 0 ? history[history.length - 1].pe : null;
}

/** PEG per year for the chart. Null where EPS shrank, so the line breaks instead of lying. */
export function pegSeries(history: PePoint[]): (number | null)[] {
  return history.map((point) => (point.growth > 0 ? point.pe / point.growth : null));
}
