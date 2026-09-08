/** Magnificent 7 — starter watchlist. */
export const G7_TICKERS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
] as const;

export type G7Ticker = (typeof G7_TICKERS)[number];

export function isG7Ticker(ticker: string): boolean {
  return (G7_TICKERS as readonly string[]).includes(ticker.trim().toUpperCase());
}

/** Tickers that still get curated growth / margin / P/E-history prefills. */
export const VALUATION_PREFILL_TICKERS = ["AAPL", "NVDA", "META"] as const;

export function isValuationPrefillTicker(ticker: string): boolean {
  return (VALUATION_PREFILL_TICKERS as readonly string[]).includes(ticker.trim().toUpperCase());
}
