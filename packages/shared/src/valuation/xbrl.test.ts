import { describe, expect, it } from "vitest";
import { annualCagr, latestInstant, latestQuarter, ttmFromFacts, type XbrlFact } from "./xbrl";

const duration = (start: string, end: string, val: number, filed = "2026-07-31"): XbrlFact => ({
  start,
  end,
  val,
  filed,
});

const instant = (end: string, val: number, filed = "2026-07-31"): XbrlFact => ({ end, val, filed });

/**
 * Apple's real filings, which is the case that breaks the naive approach: its
 * fourth quarter is only ever reported inside the annual figure.
 */
const APPLE_REVENUE: XbrlFact[] = [
  duration("2023-10-01", "2024-09-28", 391_035, "2024-11-01"),
  duration("2024-09-29", "2025-09-27", 416_161, "2025-10-31"),
  // Nine months of FY2025 and FY2026, as the third-quarter 10-Qs reported them.
  duration("2024-09-29", "2025-06-28", 313_695, "2025-08-01"),
  duration("2025-09-28", "2026-06-27", 364_357, "2026-07-31"),
  // Standalone quarters. Note the gap: nothing ends in September 2025.
  duration("2025-03-30", "2025-06-28", 94_036, "2025-08-01"),
  duration("2025-09-28", "2025-12-27", 143_756, "2026-01-30"),
  duration("2025-12-28", "2026-03-28", 111_184, "2026-05-01"),
  duration("2026-03-29", "2026-06-27", 109_417, "2026-07-31"),
];

describe("ttmFromFacts", () => {
  it("rolls the annual figure forward by the year-to-date delta", () => {
    // 416,161 + 364,357 − 313,695
    expect(ttmFromFacts(APPLE_REVENUE)).toBe(466_823);
  });

  it("does not simply sum the last four quarterly facts", () => {
    const naive = 94_036 + 143_756 + 111_184 + 109_417;
    // The naive sum spans fifteen months because Q4 FY2025 is missing.
    expect(naive).toBe(458_393);
    expect(ttmFromFacts(APPLE_REVENUE)).not.toBe(naive);
  });

  it("returns the annual figure when no interim period has been filed yet", () => {
    const annualOnly = [duration("2024-09-29", "2025-09-27", 416_161)];
    expect(ttmFromFacts(annualOnly)).toBe(416_161);
  });

  it("prefers the latest restatement of a period", () => {
    const restated = [
      ...APPLE_REVENUE,
      duration("2025-09-28", "2026-06-27", 999_999, "2026-08-15"),
    ];
    expect(ttmFromFacts(restated)).toBe(416_161 + 999_999 - 313_695);
  });

  it("sums four contiguous quarters for an issuer with no annual filing", () => {
    const youngFiler = [
      duration("2025-07-01", "2025-09-30", 100),
      duration("2025-10-01", "2025-12-31", 110),
      duration("2026-01-01", "2026-03-31", 125),
      duration("2026-04-01", "2026-06-30", 140),
    ];
    expect(ttmFromFacts(youngFiler)).toBe(475);
  });

  it("refuses to sum quarters that do not abut", () => {
    const withGap = [
      duration("2025-01-01", "2025-03-31", 100),
      // Skips the quarter ending June 2025 entirely.
      duration("2025-10-01", "2025-12-31", 110),
      duration("2026-01-01", "2026-03-31", 125),
      duration("2026-04-01", "2026-06-30", 140),
    ];
    expect(ttmFromFacts(withGap)).toBeNull();
  });

  it("has nothing to report when there are no facts", () => {
    expect(ttmFromFacts([])).toBeNull();
  });
});

describe("latestInstant", () => {
  it("takes the newest balance-sheet figure and ignores durations", () => {
    const facts = [
      instant("2025-09-27", 39_000),
      instant("2026-06-27", 39_544),
      duration("2025-09-28", "2026-06-27", 364_357),
    ];
    expect(latestInstant(facts)?.val).toBe(39_544);
  });

  it("breaks ties on the most recent filing, since later ones restate", () => {
    const facts = [instant("2026-06-27", 39_544, "2026-07-31"), instant("2026-06-27", 40_000, "2026-08-20")];
    expect(latestInstant(facts)?.val).toBe(40_000);
  });
});

describe("latestQuarter", () => {
  it("picks the single quarter over the year-to-date fact ending the same day", () => {
    // Both end 2026-06-27; only the span tells them apart.
    expect(latestQuarter(APPLE_REVENUE)?.val).toBe(109_417);
  });
});

describe("annualCagr", () => {
  it("compounds growth between annual figures five years apart", () => {
    const facts = [
      duration("2020-09-27", "2021-09-25", 100),
      duration("2025-09-28", "2026-09-26", 200),
    ];
    // 200/100 over five years is 2^(1/5) − 1.
    expect(annualCagr(facts, 5)).toBeCloseTo(14.87, 2);
  });

  it("declines to report when the window is nowhere near the requested span", () => {
    const facts = [
      duration("2024-09-29", "2025-09-27", 100),
      duration("2025-09-28", "2026-09-26", 120),
    ];
    expect(annualCagr(facts, 5)).toBeNull();
  });

  it("declines to report when either end is not positive", () => {
    const facts = [
      duration("2020-09-27", "2021-09-25", -10),
      duration("2025-09-28", "2026-09-26", 200),
    ];
    expect(annualCagr(facts, 5)).toBeNull();
  });
});
