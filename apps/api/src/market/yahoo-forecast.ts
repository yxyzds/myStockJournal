import { env } from "../env";

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_EPS = 1_000;

export function yahooAnalysisUrl(ticker: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker.trim().toUpperCase())}/analysis/`;
}

export type YahooForecast = {
  fwdEps: number;
  url: string;
};

type TrendPoint = {
  period?: string;
  earningsEstimate?: { avg?: { raw?: number } | number };
};

type QuoteSummaryPayload = {
  quoteSummary?: {
    result?: Array<{
      earningsTrend?: { trend?: TrendPoint[] };
    }>;
  };
};

function userAgent() {
  return env.secUserAgent || "mystockjournal/1.0";
}

/** Current-year consensus EPS (Yahoo Analysis "Current Year"). */
export function parseYahooFwdEps(body: QuoteSummaryPayload): number | null {
  const trend = body.quoteSummary?.result?.[0]?.earningsTrend?.trend ?? [];
  const currentYear = trend.find((row) => row.period === "0y");
  const avg = currentYear?.earningsEstimate?.avg;
  const value = typeof avg === "number" ? avg : avg?.raw;
  if (value == null || !Number.isFinite(value) || value <= 0 || value >= MAX_EPS) return null;
  return Math.round(value * 100) / 100;
}

function asPayload(value: unknown): QuoteSummaryPayload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as QuoteSummaryPayload & { body?: unknown };
  if (row.quoteSummary) return row;
  if (typeof row.body === "string") {
    try {
      return asPayload(JSON.parse(row.body));
    } catch {
      return null;
    }
  }
  if (row.body && typeof row.body === "object") return asPayload(row.body);
  return null;
}

/** Yahoo embeds quoteSummary JSON in a script tag on the Analysis page. */
export function parseYahooAnalysisHtml(html: string): number | null {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  for (const script of scripts) {
    if (!script.includes("earningsTrend") || !script.includes("0y")) continue;
    try {
      const payload = asPayload(JSON.parse(script));
      const fwdEps = payload ? parseYahooFwdEps(payload) : null;
      if (fwdEps != null) return fwdEps;
    } catch {
      /* next script */
    }
  }
  return null;
}

export async function fetchYahooFwdEps(rawTicker: string): Promise<YahooForecast | null> {
  const ticker = rawTicker.trim().toUpperCase();
  if (!ticker) return null;
  const url = yahooAnalysisUrl(ticker);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent(),
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const fwdEps = parseYahooAnalysisHtml(await res.text());
    if (fwdEps == null) return null;
    return { fwdEps, url };
  } catch (error) {
    console.warn(`Yahoo forecast failed for ${ticker}`, error);
    return null;
  }
}
