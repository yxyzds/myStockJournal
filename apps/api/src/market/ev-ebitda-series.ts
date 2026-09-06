import {
  enterpriseValue,
  evEbitdaUnavailableReason,
  type EvEbitdaAnnualPoint,
  type EvEbitdaSeriesPoint,
  type PeerMultiple,
  type PeChartPeriod,
} from "@mystockjournal/shared";
import { getAnchors } from "./fundamentals";
import { getQuotes } from "./quotes";
import { fetchTencentKline, type KlinePeriod } from "./tencent";

const WEEK_BARS = 52;
const MONTH_BARS = 36;
/** Enough monthly closes to pair with ~10 years of filed EBITDA. */
const YEAR_MONTH_BARS = 120;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function multipleFromEv(ev: number, ebitda: number | null): number | null {
  if (ebitda == null || ebitda <= 0 || !Number.isFinite(ev)) return null;
  return round1(ev / ebitda);
}

export { evEbitdaUnavailableReason };

function emptyPeFields() {
  return {
    pe: null as number | null,
    peg: null as number | null,
    history: [] as PeerMultiple["history"],
    peUnavailableReason: null as string | null,
  };
}

function peerFields(
  ticker: string,
  name: string,
  price: number | null,
  ebitda: number | null,
  shares: number,
  cash: number,
  debt: number,
): PeerMultiple {
  const ev =
    price != null && price > 0 && shares > 0 ? enterpriseValue(price, shares, cash, debt) : null;
  const evEbitda = ev != null ? multipleFromEv(ev, ebitda) : null;
  return {
    ticker,
    name,
    price,
    ...emptyPeFields(),
    evEbitda,
    evEbitdaUnavailableReason: evEbitda == null ? evEbitdaUnavailableReason(price, ebitda) : null,
  };
}

function labelForBar(date: string, period: Exclude<PeChartPeriod, "year">) {
  return period === "month" ? date.slice(0, 7) : date.slice(5);
}

function seriesFromKline(
  bars: { date: string; close: number }[],
  ebitda: number | null,
  shares: number,
  cash: number,
  debt: number,
  period: Exclude<PeChartPeriod, "year">,
): EvEbitdaSeriesPoint[] {
  return bars
    .map((bar) => {
      if (!(bar.close > 0) || !(shares > 0)) return null;
      const evEbitda = multipleFromEv(enterpriseValue(bar.close, shares, cash, debt), ebitda);
      if (evEbitda == null) return null;
      return { label: labelForBar(bar.date, period), evEbitda };
    })
    .filter((point): point is EvEbitdaSeriesPoint => point != null);
}

/** Last monthly close in each calendar year. */
export function yearEndCloses(bars: { date: string; close: number }[]): Map<number, number> {
  const byYear = new Map<number, { date: string; close: number }>();
  for (const bar of bars) {
    if (!(bar.close > 0) || bar.date.length < 4) continue;
    const year = Number(bar.date.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const seen = byYear.get(year);
    if (!seen || bar.date > seen.date) byYear.set(year, bar);
  }
  return new Map([...byYear.entries()].map(([year, bar]) => [year, bar.close]));
}

export function annualSeriesFromFilings(
  history: EvEbitdaAnnualPoint[],
  yearCloses: Map<number, number>,
  shares: number,
  cash: number,
  debt: number,
): EvEbitdaSeriesPoint[] {
  if (!(shares > 0)) return [];
  return history
    .map((point) => {
      const close = yearCloses.get(point.year);
      if (close == null) return null;
      const evEbitda = multipleFromEv(enterpriseValue(close, shares, cash, debt), point.ebitda);
      if (evEbitda == null) return null;
      return { label: String(point.year), evEbitda };
    })
    .filter((point): point is EvEbitdaSeriesPoint => point != null);
}

async function klineSeriesForTicker(
  ticker: string,
  period: Exclude<PeChartPeriod, "year">,
): Promise<{ series: EvEbitdaSeriesPoint[]; peer: PeerMultiple }> {
  const count = period === "week" ? WEEK_BARS : MONTH_BARS;
  const [bars, anchors, quotes] = await Promise.all([
    fetchTencentKline(ticker, period as KlinePeriod, count),
    getAnchors(ticker),
    getQuotes([ticker]),
  ]);
  const quote = quotes[0];
  const price = quote?.price ?? null;
  const peer = peerFields(
    ticker,
    quote?.name ?? ticker,
    price,
    anchors.ttmEbitda,
    anchors.shares,
    anchors.cash,
    anchors.debt,
  );
  const series = seriesFromKline(
    bars,
    anchors.ttmEbitda,
    anchors.shares,
    anchors.cash,
    anchors.debt,
    period,
  );
  return { series, peer };
}

async function annualRowForTicker(ticker: string): Promise<{
  series: EvEbitdaSeriesPoint[];
  peer: PeerMultiple;
}> {
  const [anchors, quotes, bars] = await Promise.all([
    getAnchors(ticker),
    getQuotes([ticker]),
    fetchTencentKline(ticker, "month", YEAR_MONTH_BARS),
  ]);
  const quote = quotes[0];
  const price = quote?.price ?? null;
  const peer = peerFields(
    ticker,
    quote?.name ?? ticker,
    price,
    anchors.ttmEbitda,
    anchors.shares,
    anchors.cash,
    anchors.debt,
  );
  let series = annualSeriesFromFilings(
    anchors.ebitdaHistory,
    yearEndCloses(bars),
    anchors.shares,
    anchors.cash,
    anchors.debt,
  );
  if (series.length === 0 && peer.evEbitda != null) {
    series = [{ label: String(new Date().getFullYear()), evEbitda: peer.evEbitda }];
  }
  return { series, peer };
}

export type EvEbitdaChartPayload = {
  period: PeChartPeriod;
  series: EvEbitdaSeriesPoint[];
  peers: Array<PeerMultiple & { series: EvEbitdaSeriesPoint[] }>;
};

export async function buildEvEbitdaChart(
  ticker: string,
  period: PeChartPeriod,
  peerTickers: string[],
): Promise<EvEbitdaChartPayload> {
  const self = ticker.trim().toUpperCase();
  const peers = [
    ...new Set(peerTickers.map((item) => item.trim().toUpperCase()).filter((item) => item && item !== self)),
  ];

  if (period === "year") {
    const selfRow = await annualRowForTicker(self);
    const peerRows: EvEbitdaChartPayload["peers"] = [];
    for (const peerTicker of peers) {
      const row = await annualRowForTicker(peerTicker);
      peerRows.push({ ...row.peer, series: row.series });
    }
    return { period, series: selfRow.series, peers: peerRows };
  }

  const selfRow = await klineSeriesForTicker(self, period);
  const peerRows: EvEbitdaChartPayload["peers"] = [];
  for (const peerTicker of peers) {
    const row = await klineSeriesForTicker(peerTicker, period);
    peerRows.push({ ...row.peer, series: row.series });
  }
  return { period, series: selfRow.series, peers: peerRows };
}
