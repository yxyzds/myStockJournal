import type { ValuationAnchors, ValuationMethod } from "@mystockjournal/shared";

/** The save / fair-value / hand-off actions every method view shares. */
export type ValuationActions = {
  saving: boolean;
  saved: boolean;
  handingOff: boolean;
  error: string | null;
  onSave: () => void;
  onSetFairValue: () => void;
  onUseInDecision: () => void;
};

export type MethodViewProps = {
  ticker: string;
  anchors: ValuationAnchors;
  currentPrice: number;
  priceAsOf: string | null;
  myFairValue: number | null;
  myFairValueMethod: ValuationMethod | null;
  actions: ValuationActions;
};
