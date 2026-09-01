export type DecisionAction = "BUY" | "SELL" | "THESIS UPDATE";

export type MockDecision = {
  id: string;
  ticker: string;
  name: string;
  date: string;
  dateLabel: string;
  action: DecisionAction;
  actionColor: "green" | "blue" | "amber";
  rationale: string;
  score?: number;
  scoreVariant: "strong" | "weak" | "none";
};

export type MockWatchRow = {
  ticker: string;
  closePrice: string;
  fairValue: string;
  changePercent: number;
  /** First decision for this ticker, if any — used by Watch List links. */
  decisionId?: string;
};

export type MockTxn = {
  side: "buy" | "sell";
  price: string;
  qty: string;
  date: string;
  reason: string;
};

export type MockJudgment = {
  id: number;
  dotColor: string;
  title: string;
  teaser: string;
  detail: string;
  actionLabel: string;
};

export const DECISIONS: MockDecision[] = [
  {
    id: "aapl-2026-08-27",
    ticker: "AAPL",
    name: "Apple Inc.",
    date: "2026-08-27",
    dateLabel: "Aug 27",
    action: "BUY",
    actionColor: "green",
    rationale: "Added — AI should accelerate the iPhone upgrade cycle.",
    score: 78,
    scoreVariant: "strong",
  },
  {
    id: "nvda-2026-08-24",
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    date: "2026-08-24",
    dateLabel: "Aug 24",
    action: "THESIS UPDATE",
    actionColor: "blue",
    rationale: "AI CapEx is slowing; reviewing my growth assumption.",
    scoreVariant: "none",
  },
  {
    id: "nvda-2026-08-22",
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    date: "2026-08-22",
    dateLabel: "Aug 22",
    action: "BUY",
    actionColor: "green",
    rationale: "Bought the dip, but did I really test my thesis?",
    score: 62,
    scoreVariant: "weak",
  },
];

export const WATCH_ROWS: MockWatchRow[] = [
  { ticker: "AAPL", closePrice: "$201.32", fairValue: "$225.00", changePercent: 8.51, decisionId: "aapl-2026-08-27" },
  { ticker: "GOOGL", closePrice: "$178.64", fairValue: "$195.00", changePercent: 9.16 },
  { ticker: "NVDA", closePrice: "$131.48", fairValue: "$120.00", changePercent: -8.74 },
];

export const AAPL_LIVE = { price: "$201.32", pe: "21.5×" };

export const AAPL_JOURNAL_SEED =
  "On-device intelligence should pull forward the iPhone upgrade cycle across the installed base. Services keeps compounding margins, and the developer ecosystem looks stickier than ever — this feels like a durable, multi-year refresh rather than a one-quarter bump.\n\nI sized the position modestly because the AI upgrade thesis is still early. The indicator I'm watching is whether Services growth stalls, or the AI features fail to move upgrades. Revisiting after next earnings.";

export function transactionsFor(decision: MockDecision): MockTxn[] {
  if (decision.id === "aapl-2026-08-27") {
    return [
      {
        side: "buy",
        price: "$201.32",
        qty: "25 shares",
        date: "Aug 27, 2026",
        reason:
          "Valuation supported by P/E band; strong services margin growth expected to sustain through next cycle.",
      },
      {
        side: "sell",
        price: "$218.50",
        qty: "10 shares",
        date: "Sep 3, 2026",
        reason:
          "Trimmed position after 8% rally above fair value target; locking in gains ahead of earnings uncertainty.",
      },
    ];
  }
  if (decision.action === "BUY") {
    return [
      {
        side: "buy",
        price: decision.ticker === "NVDA" ? "$118.40" : "$201.32",
        qty: "40 shares",
        date: `${decision.dateLabel}, 2026`,
        reason: decision.rationale,
      },
    ];
  }
  return [];
}

export function journalSeedFor(decision: MockDecision) {
  if (decision.ticker === "AAPL") return AAPL_JOURNAL_SEED;
  return decision.rationale;
}

export const JUDGMENT_ITEMS: MockJudgment[] = [
  {
    id: 1,
    dotColor: "bg-amber-400",
    title: "Review NVDA growth assumption",
    teaser: "AI CapEx slowed; your DCF still assumes 30% FCF growth.",
    detail:
      "Your original thesis modeled 30% free-cash-flow growth through FY2027, anchored to hyperscaler CapEx acceleration. Three major cloud providers have since signaled CapEx moderation. The implied growth rate embedded in current prices may now exceed what the data supports. Your judgment is needed before this position grows further.",
    actionLabel: "Review DCF",
  },
  {
    id: 2,
    dotColor: "bg-blue-400",
    title: "GOOGL 10-K filed",
    teaser: "New annual filing — your thesis has two open questions.",
    detail: "",
    actionLabel: "Review thesis",
  },
  {
    id: 3,
    dotColor: "bg-slate-300",
    title: "MSFT exit — outcome review",
    teaser: "You sold MSFT at $385. It's now $412. Was the call right?",
    detail: "",
    actionLabel: "Review decision",
  },
];

export function decisionHref(d: MockDecision) {
  return `/stock/${d.ticker}/decision/${d.id}`;
}

export function stockHref(ticker: string) {
  return `/stock/${ticker.trim().toUpperCase()}`;
}

export function findDecision(ticker: string, id: string) {
  return DECISIONS.find(
    (d) => d.id === id && d.ticker.toUpperCase() === ticker.toUpperCase(),
  );
}

export function findLatestDecision(ticker: string) {
  const symbol = ticker.trim().toUpperCase();
  return (
    DECISIONS.filter((d) => d.ticker === symbol).sort((a, b) => b.date.localeCompare(a.date))[0] ??
    null
  );
}

/** Detail page payload: latest mock decision if one exists, otherwise an empty workspace. */
export function stockWorkspaceDecision(ticker: string, name?: string): MockDecision {
  const latest = findLatestDecision(ticker);
  if (latest) return latest;
  const symbol = ticker.trim().toUpperCase();
  return {
    id: `${symbol.toLowerCase()}-workspace`,
    ticker: symbol,
    name: name?.trim() || symbol,
    date: "",
    dateLabel: "",
    action: "THESIS UPDATE",
    actionColor: "blue",
    rationale: "",
    scoreVariant: "none",
  };
}
