/** Where a WACC calculator input came from — fetched facts lock, the rest stay editable. */
export type WaccFieldSource = "filing" | "yahoo" | "ai" | "user" | "missing";

export type WaccBuild = {
  rf: number | null;
  beta: number | null;
  erp: number | null;
  preTaxCostOfDebt: number | null;
  taxRate: number | null;
  /** Equity market cap in $M. */
  equity: number;
  /** Interest-bearing debt in $M. */
  debt: number;
};

export type WaccSources = {
  rf: WaccFieldSource;
  beta: WaccFieldSource;
  erp: WaccFieldSource;
  preTaxCostOfDebt: WaccFieldSource;
  taxRate: WaccFieldSource;
  equity: WaccFieldSource;
  debt: WaccFieldSource;
};

export type WaccInputsResponse = {
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
  sources: WaccSources;
};

export type WaccPrefillResponse = {
  erp: number;
  rf?: number;
  beta?: number;
  preTaxCostOfDebt?: number;
  taxRate?: number;
  note: string;
};

export const WACC_BUILD_LIMITS = {
  rf: { min: 0, max: 15, step: 0.1 },
  beta: { min: 0, max: 5, step: 0.01 },
  erp: { min: 2, max: 12, step: 0.1 },
  preTaxCostOfDebt: { min: 0, max: 20, step: 0.1 },
  taxRate: { min: 0, max: 50, step: 0.1 },
} as const;

export type WaccComputed = {
  costOfEquity: number | null;
  afterTaxCostOfDebt: number | null;
  totalValue: number;
  equityWeight: number | null;
  debtWeight: number | null;
  /** One decimal, matching DRIVER_LIMITS.wacc. */
  wacc: number | null;
};

function present(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Default ERP when facts are complete and the user has not applied a judgment. */
export const DEFAULT_EQUITY_RISK_PREMIUM = 5.5;

/**
 * Build a WACC from fetched CAPM facts plus the default ERP. Returns null when
 * Rf/beta (and Rd/tax if there is debt) are missing or the result is out of range.
 */
export function prefillWaccFromFacts(facts: {
  rf: number | null;
  beta: number | null;
  equity: number;
  debt: number;
  preTaxCostOfDebt: number | null;
  taxRate: number | null;
  erp?: number;
}): { wacc: number; build: WaccBuild } | null {
  const build: WaccBuild = {
    rf: facts.rf,
    beta: facts.beta,
    erp: facts.erp ?? DEFAULT_EQUITY_RISK_PREMIUM,
    preTaxCostOfDebt: facts.preTaxCostOfDebt,
    taxRate: facts.taxRate,
    equity: Math.max(0, facts.equity),
    debt: Math.max(0, facts.debt),
  };
  const { wacc } = computeWacc(build);
  if (wacc == null || wacc < 4 || wacc > 20) return null;
  return { wacc, build };
}

/**
 * CAPM cost of equity and after-tax cost of debt, then market-value WACC.
 * Zero debt means WACC equals Re — no need for Rd.
 */
export function computeWacc(build: WaccBuild): WaccComputed {
  const equity = Math.max(0, build.equity);
  const debt = Math.max(0, build.debt);
  const totalValue = equity + debt;
  const equityWeight = totalValue > 0 ? equity / totalValue : null;
  const debtWeight = totalValue > 0 ? debt / totalValue : null;

  const costOfEquity =
    present(build.rf) && present(build.beta) && present(build.erp)
      ? round2(build.rf + build.beta * build.erp)
      : null;

  const afterTaxCostOfDebt =
    present(build.preTaxCostOfDebt) && present(build.taxRate)
      ? round2(build.preTaxCostOfDebt * (1 - build.taxRate / 100))
      : null;

  let wacc: number | null = null;
  if (costOfEquity != null) {
    if (debt <= 0 || totalValue <= 0) {
      wacc = round1(costOfEquity);
    } else if (afterTaxCostOfDebt != null && equityWeight != null && debtWeight != null) {
      wacc = round1(equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt);
    }
  }

  return { costOfEquity, afterTaxCostOfDebt, totalValue, equityWeight, debtWeight, wacc };
}

function optionalNum(value: unknown, limits: { min: number; max: number }): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < limits.min || n > limits.max) return null;
  return n;
}

/** Restore a saved calculator snapshot. Invalid pieces drop to null rather than failing the model. */
export function parseWaccBuild(raw: unknown): WaccBuild | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  const equity = typeof row.equity === "number" && Number.isFinite(row.equity) ? Math.max(0, row.equity) : 0;
  const debt = typeof row.debt === "number" && Number.isFinite(row.debt) ? Math.max(0, row.debt) : 0;
  return {
    rf: optionalNum(row.rf, WACC_BUILD_LIMITS.rf),
    beta: optionalNum(row.beta, WACC_BUILD_LIMITS.beta),
    erp: optionalNum(row.erp, WACC_BUILD_LIMITS.erp),
    preTaxCostOfDebt: optionalNum(row.preTaxCostOfDebt, WACC_BUILD_LIMITS.preTaxCostOfDebt),
    taxRate: optionalNum(row.taxRate, WACC_BUILD_LIMITS.taxRate),
    equity,
    debt,
  };
}
