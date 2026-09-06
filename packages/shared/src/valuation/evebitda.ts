/** One year of filed EBITDA, in $M. Used to rebuild the annual EV/EBITDA series. */
export type EvEbitdaAnnualPoint = {
  year: number;
  ebitda: number;
  /** Diluted shares that year, in millions. Needed so unadjusted prices are not paired with today's post-split count. */
  shares?: number | null;
};

/** Chart-ready EV/EBITDA point — yearly or week/month bars from live prices. */
export type EvEbitdaSeriesPoint = {
  /** Axis label: "2024", "2025-09", "2025-09-12", etc. */
  label: string;
  evEbitda: number;
};

export type EvEbitdaInputs = {
  /** The multiple the user is willing to pay for the whole firm. */
  expectedEvEbitda: number;
  ttmEbitda: number;
  cash: number;
  debt: number;
  shares: number;
};

export type EvEbitdaResult = {
  /** Market enterprise value at the live price: price × shares − cash + debt. */
  ev: number;
  currentMultiple: number | null;
  targetEv: number;
  equity: number;
  fairValue: number;
  mos: number;
};

/** Human-readable why a ticker cannot be plotted or compared as an EV/EBITDA. */
export function evEbitdaUnavailableReason(
  price: number | null,
  ebitda: number | null,
): string | null {
  if (price == null) return "暂无行情价格，无法计算 EV/EBITDA。";
  if (ebitda == null) return "无 EBITDA 数据（财报未披露经营利润或折旧摊销）。";
  if (ebitda <= 0) return "EBITDA 为零或为负，EV/EBITDA 无定义。";
  return null;
}

/** Enterprise value the market is paying: equity market cap, less cash, plus debt. */
export function enterpriseValue(price: number, shares: number, cash: number, debt: number) {
  return price * shares - cash + debt;
}

export function valueEvEbitda(inp: EvEbitdaInputs, currentPrice: number): EvEbitdaResult {
  const ev = enterpriseValue(currentPrice, inp.shares, inp.cash, inp.debt);
  const currentMultiple = inp.ttmEbitda > 0 && Number.isFinite(ev) ? ev / inp.ttmEbitda : null;
  const targetEv = inp.expectedEvEbitda * inp.ttmEbitda;
  const equity = targetEv - inp.debt + inp.cash;
  const fairValue = inp.shares > 0 ? equity / inp.shares : 0;
  const mos = currentPrice > 0 ? ((fairValue - currentPrice) / currentPrice) * 100 : 0;
  return { ev, currentMultiple, targetEv, equity, fairValue, mos };
}

/**
 * Average EV/EBITDA over the `years` most recent *completed* years.
 * The latest point is the current multiple, so it is excluded from the averages.
 */
export function trailingAverageEvEbitda(
  history: Array<{ evEbitda: number }>,
  years: number,
): number | null {
  const completed = history.slice(0, -1);
  if (completed.length < years) return null;
  const window = completed.slice(-years);
  return window.reduce((sum, point) => sum + point.evEbitda, 0) / window.length;
}
