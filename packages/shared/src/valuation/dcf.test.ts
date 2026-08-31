import { describe, expect, it } from "vitest";
import { DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE, valueDcf } from "./dcf";

describe("DCF — DDOG base case", () => {
  it("reconciles FV ~$218.22 and MOS -12.0% at $248", () => {
    const { bridge } = valueDcf(DDOG_BASE_INPUTS, DDOG_CURRENT_PRICE);
    expect(bridge.fv).toBeCloseTo(218.22, 2);
    expect(bridge.mos).toBeCloseTo(-12.0, 1);
  });

  it("returns empty bridge when WACC <= terminal growth", () => {
    const { bridge } = valueDcf({ ...DDOG_BASE_INPUTS, wacc: 3, termGrowth: 4 }, DDOG_CURRENT_PRICE);
    expect(bridge.fv).toBe(0);
    expect(bridge.mos).toBe(-100);
  });
});
