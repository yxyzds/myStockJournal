export type Quote = {
  ticker: string;
  name: string;
  /** Prior-session close — the reference price for valuation / MOS, not a live last trade. */
  price: number | null;
  currency: string;
  /** Latest session move vs that close, if the vendor sent one. Not used as a valuation input. */
  changePercent: number | null;
  previousClose: number | null;
  fetchedAt: string | null;
};

export type WatchlistItem = Quote & {
  stockId: string;
  fairValue: number | null;
  /** MOS vs prior close when a fair value exists: (fv - price) / price. */
  mosPercent: number | null;
};
