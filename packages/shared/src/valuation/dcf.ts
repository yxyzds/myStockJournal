export type DcfInputs = {
  ttmRevenue: number;
  growthY1_5: number;
  growthY6_10: number;
  termGrowth: number;
  wacc: number;
  fcfMarginY1: number;
  fcfMarginTerm: number;
  cash: number;
  debt: number;
  shares: number;
};

export type DcfYearRow = {
  year: number;
  revenue: number;
  growthPct: number;
  fcfMargin: number;
  fcf: number;
  pvFcf: number;
};

export type DcfBridge = {
  pvFcfs: number;
  tv: number;
  pvTv: number;
  ev: number;
  equity: number;
  fv: number;
  mos: number;
};

export const DDOG_BASE_INPUTS: DcfInputs = {
  ttmRevenue: 3966.7,
  growthY1_5: 20.0,
  growthY6_10: 12.0,
  termGrowth: 4.0,
  wacc: 9.0,
  fcfMarginY1: 25.0,
  fcfMarginTerm: 33.0,
  cash: 3200,
  debt: 800,
  shares: 325,
};

export const DDOG_CURRENT_PRICE = 248.0;

export function calcDcfRows(inp: DcfInputs, startYear = 2026): DcfYearRow[] {
  const rows: DcfYearRow[] = [];
  let rev = inp.ttmRevenue;
  const fade = (inp.fcfMarginTerm - inp.fcfMarginY1) / 9;
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? inp.growthY1_5 : inp.growthY6_10;
    rev = rev * (1 + g / 100);
    const margin = inp.fcfMarginY1 + fade * (i - 1);
    const fcf = (rev * margin) / 100;
    const pv = fcf / Math.pow(1 + inp.wacc / 100, i);
    rows.push({
      year: startYear - 1 + i,
      revenue: rev,
      growthPct: g,
      fcfMargin: margin,
      fcf,
      pvFcf: pv,
    });
  }
  return rows;
}

export function calcDcfBridge(
  inp: DcfInputs,
  rows: DcfYearRow[],
  currentPrice: number,
): DcfBridge {
  if (inp.wacc <= inp.termGrowth) {
    return { pvFcfs: 0, tv: 0, pvTv: 0, ev: 0, equity: 0, fv: 0, mos: -100 };
  }
  const pvFcfs = rows.reduce((sum, row) => sum + row.pvFcf, 0);
  const lastFcf = rows[rows.length - 1].fcf;
  const tv = (lastFcf * (1 + inp.termGrowth / 100)) / ((inp.wacc - inp.termGrowth) / 100);
  const pvTv = tv / Math.pow(1 + inp.wacc / 100, 10);
  const ev = pvFcfs + pvTv;
  const equity = ev + inp.cash - inp.debt;
  const fv = equity / inp.shares;
  const mos = ((fv - currentPrice) / currentPrice) * 100;
  return { pvFcfs, tv, pvTv, ev, equity, fv, mos };
}

export function valueDcf(inp: DcfInputs, currentPrice: number, startYear = 2026) {
  const rows = calcDcfRows(inp, startYear);
  const bridge = calcDcfBridge(inp, rows, currentPrice);
  return { rows, bridge };
}
