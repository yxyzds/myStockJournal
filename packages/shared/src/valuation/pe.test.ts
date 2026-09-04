import { describe, expect, it } from "vitest";
import { median, pegSeries, trailingAveragePe, valuePe, type PeInputs, type PePoint } from "./pe";

// AAPL forward P/E history from the design spec. 2023 EPS declined, so PEG breaks there.
const HISTORY: PePoint[] = [
  { year: 2015, pe: 12.5, growth: 7 },
  { year: 2016, pe: 13.8, growth: 15 },
  { year: 2017, pe: 17.4, growth: 12 },
  { year: 2018, pe: 12.8, growth: 29 },
  { year: 2019, pe: 21.3, growth: 12 },
  { year: 2020, pe: 33.4, growth: 10 },
  { year: 2021, pe: 30.1, growth: 71 },
  { year: 2022, pe: 21.6, growth: 9 },
  { year: 2023, pe: 28.8, growth: -3 },
  { year: 2024, pe: 29.2, growth: 12 },
  { year: 2025, pe: 26.1, growth: 10 },
];

const BASE: PeInputs = {
  expectedPe: 24,
  epsBasis: "fwd",
  ttmEps: 6.43,
  fwdEps: 9.38,
  expectedGrowth: 10,
};

describe("P/E", () => {
  it("values at expected multiple times the chosen EPS basis", () => {
    expect(valuePe(BASE, 201.32).fairValue).toBeCloseTo(225.12, 2);
    expect(valuePe({ ...BASE, epsBasis: "ttm" }, 201.32).fairValue).toBeCloseTo(154.32, 2);
  });

  it("reports margin of safety against the current price", () => {
    expect(valuePe(BASE, 201.32).mos).toBeCloseTo(11.82, 2);
  });

  it("reads the current multiple off the live price, on the same EPS basis", () => {
    expect(valuePe(BASE, 201.32).currentPe).toBeCloseTo(21.46, 2);
    expect(valuePe({ ...BASE, epsBasis: "ttm" }, 201.32).currentPe).toBeCloseTo(31.31, 2);
  });

  it("derives the PEG lens from expected growth", () => {
    const result = valuePe(BASE, 201.32);
    expect(result.currentPeg).toBeCloseTo(2.15, 2);
    expect(result.pegAtExpectedPe).toBeCloseTo(2.4, 2);
    expect(result.impliedPeAtPeg1).toBeCloseTo(10, 2);
    expect(result.impliedPeAtPeg2).toBeCloseTo(20, 2);
  });

  it("drops PEG when earnings are shrinking or negative", () => {
    const result = valuePe({ ...BASE, expectedGrowth: 0.1, fwdEps: -1 }, 201.32);
    expect(result.pegAtExpectedPe).toBeNull();
    expect(result.currentPe).toBeNull();
  });

  it("averages only completed years, excluding the current multiple", () => {
    expect(trailingAveragePe(HISTORY, 5)).toBeCloseTo(28.62, 2);
    expect(trailingAveragePe(HISTORY, 10)).toBeCloseTo(22.09, 2);
    expect(trailingAveragePe(HISTORY, 20)).toBeNull();
  });

  it("breaks the PEG series where EPS declined", () => {
    const series = pegSeries(HISTORY);
    expect(series[8]).toBeNull();
    expect(series[9]).toBeCloseTo(29.2 / 12, 4);
  });

  it("takes the midpoint of an even-length peer set", () => {
    expect(median([20.1, 25.3, 34.2, 35.4])).toBeCloseTo(29.75, 2);
    expect(median([20.1, 25.3, 34.2])).toBeCloseTo(25.3, 2);
    expect(median([])).toBeNull();
  });
});
