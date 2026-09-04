import { describe, expect, it } from "vitest";
import { DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE, valueDcf } from "./dcf";
import { rdcfToDcfInputs, solveImpliedGrowth, valueRdcf, type RdcfInputs } from "./rdcf";

const DDOG_HELD: RdcfInputs = {
  ttmRevenue: DDOG_BASE_INPUTS.ttmRevenue,
  cash: DDOG_BASE_INPUTS.cash,
  debt: DDOG_BASE_INPUTS.debt,
  shares: DDOG_BASE_INPUTS.shares,
  wacc: DDOG_BASE_INPUTS.wacc,
  termGrowth: DDOG_BASE_INPUTS.termGrowth,
  fcfMarginY1: DDOG_BASE_INPUTS.fcfMarginY1,
  fcfMarginTerm: DDOG_BASE_INPUTS.fcfMarginTerm,
  growthY6_10: DDOG_BASE_INPUTS.growthY6_10,
};

describe("reverse DCF — DDOG held constant", () => {
  it("feeding the implied growth back into the DCF returns the market price", () => {
    const implied = solveImpliedGrowth(DDOG_HELD, DDOG_CURRENT_PRICE);
    expect(implied).not.toBeNull();

    const { bridge } = valueDcf(rdcfToDcfInputs(DDOG_HELD, implied!), DDOG_CURRENT_PRICE);
    expect(bridge.fv).toBeCloseTo(DDOG_CURRENT_PRICE, 2);
    expect(bridge.mos).toBeCloseTo(0, 2);
  });

  it("implies faster growth than the base case, because the base case is below the price", () => {
    const implied = solveImpliedGrowth(DDOG_HELD, DDOG_CURRENT_PRICE);
    expect(implied).toBeGreaterThan(DDOG_BASE_INPUTS.growthY1_5);
  });

  it("bridges price to target EV as market cap less cash plus debt", () => {
    const { marketCap, targetEv } = valueRdcf(DDOG_HELD, DDOG_CURRENT_PRICE);
    expect(marketCap).toBeCloseTo(DDOG_CURRENT_PRICE * DDOG_HELD.shares, 6);
    expect(targetEv).toBeCloseTo(marketCap - DDOG_HELD.cash + DDOG_HELD.debt, 6);
  });

  it("has no solution when WACC does not exceed terminal growth", () => {
    expect(solveImpliedGrowth({ ...DDOG_HELD, wacc: 3, termGrowth: 4 }, DDOG_CURRENT_PRICE)).toBeNull();
  });

  it("has no solution when the price is beyond what any growth rate supports", () => {
    expect(solveImpliedGrowth(DDOG_HELD, 100_000)).toBeNull();
  });
});
