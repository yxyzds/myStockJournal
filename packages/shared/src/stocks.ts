/** Magnificent 7 — starter watchlist and the only tickers with curated valuation prefills. */
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
