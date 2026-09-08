import { describe, expect, it } from "vitest";
import { computeWacc, parseWaccBuild, type WaccBuild } from "./wacc";

const SAMPLE: WaccBuild = {
  rf: 4.3,
  beta: 0.82,
  erp: 5.5,
  preTaxCostOfDebt: 5.5,
  taxRate: 21,
  equity: 3_000_000,
  debt: 98_000,
};

describe("computeWacc", () => {
  it("matches the CAPM screenshot arithmetic", () => {
    const out = computeWacc(SAMPLE);
    expect(out.costOfEquity).toBeCloseTo(8.81, 2);
    expect(out.afterTaxCostOfDebt).toBeCloseTo(4.35, 2);
    expect(out.wacc).not.toBeNull();
    expect(out.equityWeight! + out.debtWeight!).toBeCloseTo(1, 6);
  });

  it("equals cost of equity when there is no debt", () => {
    const out = computeWacc({ ...SAMPLE, debt: 0 });
    expect(out.wacc).toBe(8.8);
    expect(out.debtWeight).toBe(0);
  });

  it("needs Rd when debt is positive", () => {
    const out = computeWacc({ ...SAMPLE, preTaxCostOfDebt: null });
    expect(out.costOfEquity).toBeCloseTo(8.81, 2);
    expect(out.wacc).toBeNull();
  });

  it("needs Re before a WACC can be reported", () => {
    expect(computeWacc({ ...SAMPLE, erp: null }).wacc).toBeNull();
  });
});

describe("parseWaccBuild", () => {
  it("keeps a well-formed snapshot", () => {
    expect(parseWaccBuild(SAMPLE)?.erp).toBe(5.5);
  });

  it("drops out-of-range judgment fields instead of failing", () => {
    expect(parseWaccBuild({ ...SAMPLE, erp: 99 })?.erp).toBeNull();
  });

  it("returns undefined for garbage", () => {
    expect(parseWaccBuild(null)).toBeUndefined();
    expect(parseWaccBuild("nope")).toBeUndefined();
  });
});
