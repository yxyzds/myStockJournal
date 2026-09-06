import { env } from "../env";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_EPS = 1_000;

export function stockAnalysisForecastUrl(ticker: string) {
  return `https://stockanalysis.com/stocks/${ticker.trim().toLowerCase()}/forecast/`;
}

export type StockAnalysisForecast = {
  fwdEps: number;
  url: string;
};

/**
 * Consensus this-year EPS from a Stock Analysis forecast page. The site labels
 * that figure "EPS This Year" (S&P Global, non-GAAP).
 */
export function parseStockAnalysisFwdEps(html: string): number | null {
  if (!html.includes("EPS This Year") && !html.includes("epsThisYear")) return null;

  const patterns = [
    /EPS This Year[\s\S]{0,400}?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)/i,
    /"epsThisYear"\s*:\s*([0-9]+(?:\.[0-9]+)?)/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0 && value < MAX_EPS) return value;
  }
  return null;
}

export async function fetchStockAnalysisFwdEps(
  rawTicker: string,
): Promise<StockAnalysisForecast | null> {
  const ticker = rawTicker.trim().toUpperCase();
  if (!ticker) return null;
  const url = stockAnalysisForecastUrl(ticker);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": env.secUserAgent || "mystockjournal/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const fwdEps = parseStockAnalysisFwdEps(await res.text());
    if (fwdEps == null) return null;
    return { fwdEps, url };
  } catch (error) {
    console.warn(`Stock Analysis forecast failed for ${ticker}`, error);
    return null;
  }
}
