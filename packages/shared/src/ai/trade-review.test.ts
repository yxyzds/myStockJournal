import { describe, expect, it } from "vitest";
import { parseTradeReview, parseTradeReviewTags } from "./trade-review";

describe("parseTradeReview", () => {
  it("keeps a legacy grade-and-blurb row", () => {
    expect(
      parseTradeReview({
        grade: "Midtake",
        blurb: "Fine but generic.",
        reviewedAt: "2026-09-09T00:00:00.000Z",
      }),
    ).toEqual({
      grade: "Midtake",
      blurb: "Fine but generic.",
      reviewedAt: "2026-09-09T00:00:00.000Z",
      thesis: null,
      execution: null,
      processVsOutcome: null,
      missing: [],
    });
  });

  it("reads structured tags and drops unknown enums", () => {
    const review = parseTradeReview({
      grade: "Based",
      blurb: "Clear invalidation.",
      reviewedAt: "2026-09-09T00:00:00.000Z",
      thesis: "strong",
      execution: "impulse",
      processVsOutcome: "lucky_win",
      missing: ["invalidation", "nope", "plan", "plan"],
    });
    expect(review?.thesis).toBe("strong");
    expect(review?.execution).toBe("impulse");
    expect(review?.processVsOutcome).toBe("lucky_win");
    expect(review?.missing).toEqual(["invalidation", "plan"]);
  });

  it("rejects a missing grade or empty blurb", () => {
    expect(parseTradeReview({ blurb: "x", reviewedAt: "2026-09-09T00:00:00.000Z" })).toBeNull();
    expect(
      parseTradeReview({ grade: "Midtake", blurb: "  ", reviewedAt: "2026-09-09T00:00:00.000Z" }),
    ).toBeNull();
  });
});

describe("parseTradeReviewTags", () => {
  it("treats invalid enums as null and missing as empty", () => {
    expect(parseTradeReviewTags({ thesis: "elite", execution: 1, processVsOutcome: "win", missing: "plan" })).toEqual({
      thesis: null,
      execution: null,
      processVsOutcome: null,
      missing: [],
    });
  });
});
