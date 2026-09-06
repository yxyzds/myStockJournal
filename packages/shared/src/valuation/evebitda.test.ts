import { describe, expect, it } from "vitest";
import { trailingAverageEvEbitda, valueEvEbitda, type EvEbitdaInputs } from "./evebitda";

const BASE: EvEbitdaInputs = {
  expectedEvEbitda: 15,
  ttmEbitda: 10,
  cash: 20,
  debt: 50,
  shares: 10,
};

describe("EV/EBITDA", () => {
  it("bridges expected multiple × EBITDA back to equity fair value per share", () => {
    // target EV = 15 × 10 = 150; equity = 150 − 50 + 20 = 120; / 10 shares = 12
    expect(valueEvEbitda(BASE, 100).fairValue).toBeCloseTo(12, 6);
    expect(valueEvEbitda(BASE, 100).targetEv).toBeCloseTo(150, 6);
    expect(valueEvEbitda(BASE, 100).equity).toBeCloseTo(120, 6);
  });

  it("reports margin of safety against the current price", () => {
    expect(valueEvEbitda(BASE, 100).mos).toBeCloseTo(-88, 6);
  });

  it("reads the current multiple off live EV, not the expected multiple", () => {
    // EV = 100 × 10 − 20 + 50 = 1030; 1030 / 10 = 103
    expect(valueEvEbitda(BASE, 100).currentMultiple).toBeCloseTo(103, 6);
    expect(valueEvEbitda(BASE, 100).ev).toBeCloseTo(1030, 6);
  });

  it("drops the current multiple when EBITDA is zero or negative", () => {
    expect(valueEvEbitda({ ...BASE, ttmEbitda: 0 }, 100).currentMultiple).toBeNull();
    expect(valueEvEbitda({ ...BASE, ttmEbitda: -4 }, 100).currentMultiple).toBeNull();
  });

  it("averages only completed years, excluding the current multiple", () => {
    const history = [
      { evEbitda: 10 },
      { evEbitda: 12 },
      { evEbitda: 11 },
      { evEbitda: 14 },
      { evEbitda: 13 },
      { evEbitda: 18 },
    ];
    expect(trailingAverageEvEbitda(history, 5)).toBeCloseTo(12, 6);
    expect(trailingAverageEvEbitda(history, 10)).toBeNull();
  });
});
