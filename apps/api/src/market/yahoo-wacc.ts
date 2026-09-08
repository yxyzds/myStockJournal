import { env } from "../env";

const REQUEST_TIMEOUT_MS = 10_000;

function userAgent() {
  return env.secUserAgent || "mystockjournal/1.0";
}

type ChartPayload = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number };
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
  };
};

type QuoteSummaryPayload = {
  quoteSummary?: {
    result?: Array<{
      defaultKeyStatistics?: { beta?: { raw?: number } | number };
    }>;
  };
};

function asNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * CBOE 10-year yield (`^TNX`), already in percent (e.g. 4.28).
 */
export async function fetchTreasury10Y(): Promise<number | null> {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?interval=1d&range=5d";
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ChartPayload;
    const result = body.chart?.result?.[0];
    const fromMeta = asNumber(result?.meta?.regularMarketPrice);
    if (fromMeta != null && fromMeta > 0 && fromMeta < 15) return round2(fromMeta);
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i--) {
      const close = asNumber(closes[i]);
      if (close != null && close > 0 && close < 15) return round2(close);
    }
    return null;
  } catch (error) {
    console.warn("Yahoo ^TNX fetch failed", error);
    return null;
  }
}

function betaFromSummary(body: QuoteSummaryPayload): number | null {
  const raw = body.quoteSummary?.result?.[0]?.defaultKeyStatistics?.beta;
  const value = typeof raw === "number" ? raw : asNumber(raw && typeof raw === "object" ? raw.raw : raw);
  if (value == null || value < 0 || value > 5) return null;
  return round2(value);
}

async function fetchQuoteSummaryBeta(ticker: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=defaultKeyStatistics`;
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return betaFromSummary((await res.json()) as QuoteSummaryPayload);
}

function parseBetaFromHtml(html: string): number | null {
  const rawMatch = html.match(/"beta"\s*:\s*\{\s*"raw"\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (rawMatch) {
    const value = Number(rawMatch[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 5) return round2(value);
  }
  return null;
}

async function scrapeBeta(ticker: string): Promise<number | null> {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/key-statistics/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent(),
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return parseBetaFromHtml(await res.text());
}

/** Levered equity beta from Yahoo. Null when the quote has none. */
export async function fetchYahooBeta(rawTicker: string): Promise<number | null> {
  const ticker = rawTicker.trim().toUpperCase();
  if (!ticker) return null;
  try {
    const fromApi = await fetchQuoteSummaryBeta(ticker);
    if (fromApi != null) return fromApi;
    return await scrapeBeta(ticker);
  } catch (error) {
    console.warn(`Yahoo beta failed for ${ticker}`, error);
    return null;
  }
}
