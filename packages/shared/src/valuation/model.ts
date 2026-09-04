import type { Quote } from "../market";
import type { ValuationMethod } from "../types";
import type { DcfInputs, DcfYearRow } from "./dcf";
import type { PeInputs } from "./pe";
import type { RdcfInputs } from "./rdcf";
import type { ValuationAnchors } from "./anchors";

/** Methods with a working model. EV/EBITDA and SOTP are still placeholders. */
export const IMPLEMENTED_METHODS = ["dcf", "rdcf", "pe"] as const satisfies readonly ValuationMethod[];
export type ImplementedMethod = (typeof IMPLEMENTED_METHODS)[number];

export function isImplementedMethod(method: ValuationMethod): method is ImplementedMethod {
  return (IMPLEMENTED_METHODS as readonly ValuationMethod[]).includes(method);
}

export type ValuationAssumptions = DcfInputs | RdcfInputs | PeInputs;

type OutputsBase = {
  /** Discounting starts here, so a saved model keeps its original year labels. */
  startYear: number;
  currentPrice: number;
};

export type DcfOutputs = OutputsBase & {
  method: "dcf";
  fairValue: number;
  mosPercent: number;
  pvFcfs: number;
  tv: number;
  pvTv: number;
  ev: number;
  equity: number;
  rows: DcfYearRow[];
};

export type RdcfOutputs = OutputsBase & {
  method: "rdcf";
  /** A reverse DCF outputs a growth rate, not a fair value. */
  fairValue: null;
  impliedGrowthY1_5: number | null;
  marketCap: number;
  targetEv: number;
  pvFcfs: number;
  tv: number;
  pvTv: number;
  ev: number;
  rows: DcfYearRow[];
};

export type PeOutputs = OutputsBase & {
  method: "pe";
  fairValue: number;
  mosPercent: number;
  eps: number;
  currentPe: number | null;
  currentPeg: number | null;
  pegAtExpectedPe: number | null;
  impliedPeAtPeg1: number | null;
  impliedPeAtPeg2: number | null;
};

export type ValuationOutputs = DcfOutputs | RdcfOutputs | PeOutputs;

/** A saved worksheet. `isMyFairValue` marks the one number the watch list shows. */
export type ValuationModel = {
  id: string;
  stockId: string;
  method: ValuationMethod;
  assumptions: ValuationAssumptions;
  outputs: ValuationOutputs;
  isMyFairValue: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Everything the valuation page needs in one request. */
export type ValuationWorkbench = {
  stock: { id: string; ticker: string; name: string };
  quote: Quote | null;
  anchors: ValuationAnchors;
  models: ValuationModel[];
  myFairValue: number | null;
};

/** A peer's current multiples, for comparison on the P/E chart. */
export type PeerMultiple = {
  ticker: string;
  name: string;
  price: number | null;
  /** Null when we have no EPS for this peer. */
  pe: number | null;
  peg: number | null;
};

/** Frozen valuation attached to a decision, so history survives later edits. */
export type ValuationSnapshot = {
  id: string;
  stockId: string;
  modelId: string | null;
  method: ValuationMethod;
  fairValue: number;
  createdAt: string;
};

export const METHOD_LABELS: Record<ValuationMethod, string> = {
  dcf: "DCF",
  rdcf: "Reverse DCF",
  pe: "P/E",
  evebitda: "EV/EBITDA",
  sotp: "SOTP",
};
