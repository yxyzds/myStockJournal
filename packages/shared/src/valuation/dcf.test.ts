import { describe, expect, it } from "vitest";
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
});
