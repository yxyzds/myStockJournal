import { env } from "../env";
import { TICKER_RE } from "../lib/stocks";

const TRENDING_URL = "https://query1.finance.yahoo.com/v1/finance/trending/US?count=24";
const REQUEST_TIMEOUT_MS = 8_000;

/** Common high-attention names if the trending feed is unreachable. */
export const HOT_FALLBACK = ["AVGO", "AMD", "PLTR"] as const;

function isUsEquitySymbol(symbol: string) {
  if (!TICKER_RE.test(symbol)) return false;
  if (symbol.includes("-") || symbol.includes("=")) return false;
  return true;
}

/**
 * US cash-equity tickers currently trending on Yahoo, excluding `skip`.
 * Falls back to a short hardcoded list when the feed fails.
 */
export async function fetchHottestTickers(count: number, skip: Set<string>): Promise<string[]> {
  try {
    const res = await fetch(TRENDING_URL, {
      headers: {
        "User-Agent": env.secUserAgent || "mystockjournal/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`trending HTTP ${res.status}`);
    const body = (await res.json()) as {
      finance?: { result?: { quotes?: { symbol?: string }[] }[] };
    };
    const symbols = (body.finance?.result ?? []).flatMap((row) =>
      (row.quotes ?? []).map((quote) => (quote.symbol ?? "").trim().toUpperCase()),
    );
    const picked: string[] = [];
    for (const symbol of symbols) {
      if (picked.length >= count) break;
      if (!isUsEquitySymbol(symbol) || skip.has(symbol) || picked.includes(symbol)) continue;
      picked.push(symbol);
    }
    if (picked.length >= count) return picked;
    for (const symbol of HOT_FALLBACK) {
      if (picked.length >= count) break;
      if (skip.has(symbol) || picked.includes(symbol)) continue;
      picked.push(symbol);
    }
    return picked;
  } catch (error) {
    console.warn("trending fetch failed", error);
    return HOT_FALLBACK.filter((symbol) => !skip.has(symbol)).slice(0, count);
  }
}
