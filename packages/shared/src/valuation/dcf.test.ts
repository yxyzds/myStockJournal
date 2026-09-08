import { describe, expect, it } from "vitest";
import { dcfModelReady, EMPTY_DRIVERS, scenarioDrivers } from "./anchors";
import { DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE, valueDcf } from "./dcf";

describe("DCF — DDOG base case", () => {
  it("reconciles intrinsic ~$218.22; with MOS 0 fair value matches", () => {
    const { bridge } = valueDcf(DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE);
    expect(bridge.intrinsic).toBeCloseTo(218.22, 2);
    expect(bridge.fv).toBeCloseTo(218.22, 2);
    expect(bridge.mos).toBe(0);
  });

  it("applies the user MOS haircut to fair value", () => {
    const { bridge } = valueDcf({ ...DDOG_BASE_INPUTS, mosPercent: 20 }, DDOG_CURRENT_PRICE);
    expect(bridge.intrinsic).toBeCloseTo(218.22, 2);
    expect(bridge.fv).toBeCloseTo(218.22 * 0.8, 2);
    expect(bridge.mos).toBe(20);
  });

  it("returns empty bridge when WACC <= terminal growth", () => {
    const { bridge } = valueDcf({ ...DDOG_BASE_INPUTS, wacc: 3, termGrowth: 4 }, DDOG_CURRENT_PRICE);
    expect(bridge.fv).toBe(0);
    expect(bridge.intrinsic).toBe(0);
  });

  it("returns empty bridge when filings are missing", () => {
    const { bridge } = valueDcf(
      { ...DDOG_BASE_INPUTS, ttmRevenue: 0, shares: 0 },
      DDOG_CURRENT_PRICE,
    );
    expect(bridge.fv).toBe(0);
    expect(bridge.intrinsic).toBe(0);
  });
});

describe("dcfModelReady", () => {
  it("requires revenue, shares, and a WACC above terminal growth", () => {
    expect(dcfModelReady({ ttmRevenue: 0, shares: 100, wacc: 9, termGrowth: 3 })).toBe(false);
    expect(dcfModelReady({ ttmRevenue: 100, shares: 0, wacc: 9, termGrowth: 3 })).toBe(false);
    expect(dcfModelReady({ ttmRevenue: 100, shares: 100, wacc: 0, termGrowth: 0 })).toBe(false);
    expect(dcfModelReady({ ttmRevenue: 100, shares: 100, wacc: 9, termGrowth: 3 })).toBe(true);
  });

  it("does not clamp an unset WACC when scaling scenarios", () => {
    expect(scenarioDrivers(EMPTY_DRIVERS, "base").wacc).toBe(0);
    expect(scenarioDrivers(EMPTY_DRIVERS, "bear").wacc).toBe(0);
  });

  it("keeps the same WACC in bear, base, and bull", () => {
    const base = { ...EMPTY_DRIVERS, wacc: 9, termGrowth: 3, growthY1_5: 20 };
    expect(scenarioDrivers(base, "bear").wacc).toBe(9);
    expect(scenarioDrivers(base, "base").wacc).toBe(9);
    expect(scenarioDrivers(base, "bull").wacc).toBe(9);
  });
});
