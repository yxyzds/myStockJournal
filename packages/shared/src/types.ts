export type DecisionType = "buy" | "sell" | "thesis_update";
export type ThesisHealth = "healthy" | "weakening";
export type ValuationMethod = "dcf" | "rdcf" | "pe" | "evebitda" | "sotp";

export type Stock = {
  id: string;
  userId: string;
  ticker: string;
  name: string;
  thesis: string | null;
  coreQuestion: string | null;
  health: ThesisHealth;
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
