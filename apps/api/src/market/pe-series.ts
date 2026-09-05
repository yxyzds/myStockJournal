import type { PeerMultiple, PeChartPeriod, PePoint, PeSeriesPoint } from "@mystockjournal/shared";
import { getAnchors } from "./fundamentals";
import { getQuotes } from "./quotes";
import { fetchTencentKline, type KlinePeriod } from "./tencent";

const WEEK_BARS = 52;
const MONTH_BARS = 36;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function growthFromHistory(history: PePoint[]): number | null {
  const latest = history.at(-1);
  return latest != null && latest.growth > 0 ? latest.growth : null;
}

/** Prefer a positive forward EPS; otherwise fall back to TTM (may be negative). */
function resolveEps(fwdEps: number | null, ttmEps: number | null): number | null {
  if (fwdEps != null && fwdEps > 0) return fwdEps;
  if (ttmEps != null) return ttmEps;
  if (fwdEps != null) return fwdEps;
  return null;
}

function peFromPrice(price: number, eps: number | null): number | null {
  if (eps == null || eps <= 0 || !(price > 0)) return null;
  return round1(price / eps);
}

/** Human-readable why the peer cannot be plotted as a P/E. */
export function peUnavailableReason(price: number | null, eps: number | null): string | null {
  if (price == null) return "暂无行情价格，无法计算 P/E。";
  if (eps == null) return "无 EPS 数据（ETF 等标的暂不支持）。";
  if (eps <= 0) return "EPS 为零或为负，P/E 无定义。";
  return null;
}

function peerFields(
  ticker: string,
  name: string,
  price: number | null,
  eps: number | null,
  growth: number | null,
  history: PePoint[],
): PeerMultiple {
  const pe = peFromPrice(price ?? 0, eps);
  return {
    ticker,
    name,
    price,
    pe,
    peg: pe != null && growth != null && growth > 0 ? round1(pe / growth) : null,
    history,
    peUnavailableReason: pe == null ? peUnavailableReason(price, eps) : null,
  };
}

/** Annual curated history → chart series. */
export function annualSeriesFromHistory(history: PePoint[]): PeSeriesPoint[] {
  return history.map((point) => ({
    label: String(point.year),
    pe: point.pe,
    growth: point.growth,
  }));
}

/**
 * Approximate P/E path from K-line closes ÷ a fixed EPS. Fine for week/month
 * comparison charts; annual mode should prefer filed yearly multiples instead.
 */
export function seriesFromKline(
  bars: { date: string; close: number }[],
  eps: number | null,
  growth: number | null,
  period: Exclude<PeChartPeriod, "year">,
): PeSeriesPoint[] {
  return bars
    .map((bar) => {
      const pe = peFromPrice(bar.close, eps);
      if (pe == null) return null;
      const label =
        period === "month" ? bar.date.slice(0, 7) : bar.date.slice(5); // MM-DD for week
      return { label, pe, growth };
    })
    .filter((point): point is PeSeriesPoint => point != null);
}

async function klineSeriesForTicker(
  ticker: string,
  period: Exclude<PeChartPeriod, "year">,
): Promise<{ series: PeSeriesPoint[]; peer: Omit<PeerMultiple, "history"> & { history: PePoint[] } }> {
  const klinePeriod: KlinePeriod = period;
  const count = period === "week" ? WEEK_BARS : MONTH_BARS;
  const [bars, anchors, quotes] = await Promise.all([
    fetchTencentKline(ticker, klinePeriod, count),
    getAnchors(ticker),
    getQuotes([ticker]),
  ]);
  const quote = quotes[0];
  const eps = resolveEps(anchors.fwdEps, anchors.ttmEps);
  const growth = growthFromHistory(anchors.peHistory);
  const price = quote?.price ?? null;
  const peer = peerFields(
    ticker,
    quote?.name ?? ticker,
    price,
    eps,
    growth,
    anchors.peHistory,
  );
  const series = seriesFromKline(bars, eps, growth, period);

  return { series, peer };
}

export type PeChartPayload = {
  period: PeChartPeriod;
  series: PeSeriesPoint[];
  peers: Array<PeerMultiple & { series: PeSeriesPoint[] }>;
};

/** Build the P/E chart payload for year (filed) or week/month (live K-line ÷ EPS). */
export async function buildPeChart(
  ticker: string,
  period: PeChartPeriod,
  peerTickers: string[],
): Promise<PeChartPayload> {
  const self = ticker.trim().toUpperCase();
  const peers = [...new Set(peerTickers.map((t) => t.trim().toUpperCase()).filter((t) => t && t !== self))];

  if (period === "year") {
    const anchors = await getAnchors(self);
    const series = annualSeriesFromHistory(anchors.peHistory);
    const peerRows: PeChartPayload["peers"] = [];
    for (const peerTicker of peers) {
      const [peerAnchors, quotes] = await Promise.all([getAnchors(peerTicker), getQuotes([peerTicker])]);
      const quote = quotes[0];
      const eps = resolveEps(peerAnchors.fwdEps, peerAnchors.ttmEps);
      const price = quote?.price ?? null;
      const growth = growthFromHistory(peerAnchors.peHistory);
      peerRows.push({
        ...peerFields(
          peerTicker,
          quote?.name ?? peerTicker,
          price,
          eps,
          growth,
          peerAnchors.peHistory,
        ),
        series: annualSeriesFromHistory(peerAnchors.peHistory),
      });
    }
    return { period, series, peers: peerRows };
  }

  const selfRow = await klineSeriesForTicker(self, period);
  const peerRows: PeChartPayload["peers"] = [];
  for (const peerTicker of peers) {
    const row = await klineSeriesForTicker(peerTicker, period);
    peerRows.push({ ...row.peer, series: row.series });
  }
  return { period, series: selfRow.series, peers: peerRows };
}
