import { env } from "../env";

const REQUEST_TIMEOUT_MS = 8_000;

type ChartPayload = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { adjclose?: Array<{ adjclose?: Array<number | null> }> };
    }>;
  };
};

/**
 * Calendar year-end adjusted closes. Tencent's US monthly bars are not split-
 * adjusted, so pairing them with today's share count (or restated XBRL shares)
 * inflates historical EV/EBITDA by the split factor — NVDA 2020 showed ~3900×.
 */
export async function fetchYahooYearEndCloses(ticker: string): Promise<Map<number, number>> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return new Map();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=10y`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": env.secUserAgent || "mystockjournal/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
    const body = (await res.json()) as ChartPayload;
    const result = body.chart?.result?.[0];
    const stamps = result?.timestamp ?? [];
    const closes = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
    const byYear = new Map<number, { date: string; close: number }>();
    for (let i = 0; i < stamps.length; i++) {
      const close = closes[i];
      if (close == null || !(close > 0)) continue;
      const date = new Date(stamps[i] * 1000);
      const year = date.getUTCFullYear();
      const iso = date.toISOString().slice(0, 10);
      const seen = byYear.get(year);
      if (!seen || iso > seen.date) byYear.set(year, { date: iso, close });
    }
    return new Map([...byYear.entries()].map(([year, bar]) => [year, bar.close]));
  } catch (error) {
    console.warn(`Yahoo adj close failed for ${symbol}`, error);
    return new Map();
  }
}
