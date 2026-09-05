import type { TradeReview } from "./ai/trade-review";
import type { Quote } from "./market";

export type DecisionType = "buy" | "sell" | "thesis_update";
export type ValuationMethod = "dcf" | "rdcf" | "pe" | "evebitda" | "sotp";

export type Stock = {
  id: string;
  userId: string;
  ticker: string;
  name: string;
  thesis: string | null;
};

export type Decision = {
  id: string;
  userId: string;
  stockId: string;
  type: DecisionType;
  date: string;
  price: number | null;
  qty: number | null;
  rationale: string;
  why: string | null;
  expected: string | null;
  falsifier: string | null;
  score: number | null;
  valuationSnapshotId: string | null;
};

export type JournalSnapshot = {
  price: number | null;
  currency: string;
  pe: string | null;
};

export type JournalEntry = {
  id: string;
  stockId: string;
  date: string;
  text: string;
  snapshot: JournalSnapshot | null;
  createdAt: string;
};

export type StockTransaction = {
  id: string;
  stockId: string;
  type: "buy" | "sell";
  date: string;
  price: number | null;
  qty: number | null;
  rationale: string;
  score: number | null;
};

export type StockDetail = {
  stock: {
    id: string;
    ticker: string;
    name: string;
    watched: boolean;
  };
  quote: Quote | null;
  journal: JournalEntry[];
  transactions: StockTransaction[];
  tradeReview: TradeReview | null;
};
