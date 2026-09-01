export type Quote = {
  ticker: string;
  name: string;
  price: number | null;
  currency: string;
  changePercent: number | null;
  previousClose: number | null;
  fetchedAt: string | null;
};

export type WatchlistItem = Quote & {
  stockId: string;
  fairValue: number | null;
  /** MOS vs last close when a fair value exists: (fv - price) / price. */
  mosPercent: number | null;
};
