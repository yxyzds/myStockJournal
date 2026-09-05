/**
 * Arithmetic over SEC XBRL company facts. The HTTP client lives in the API app;
 * everything here works on already-fetched facts so it can be tested offline.
 */

/** One XBRL fact. Balance-sheet figures are instants and carry no `start`. */
export type XbrlFact = {
  start?: string;
  end: string;
  val: number;
  /** When the filing carrying this fact was submitted. Later filings restate earlier ones. */
  filed: string;
  form?: string;
};

type DurationFact = XbrlFact & { start: string };

/** A fiscal year runs 52 or 53 weeks, so the annual window has to be a range. */
const ANNUAL_MIN_DAYS = 350;
const ANNUAL_MAX_DAYS = 380;
const QUARTER_MIN_DAYS = 80;
const QUARTER_MAX_DAYS = 100;
/** Fiscal calendars shift a few days year to year; periods this close are contiguous. */
const ABUT_TOLERANCE_DAYS = 5;

/** Whole days between two ISO calendar dates. */
export function daySpan(start: string, end: string): number {
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function isDuration(fact: XbrlFact): fact is DurationFact {
  return typeof fact.start === "string";
}

/** Latest fact by period end, breaking ties on the most recent filing. */
function newest<T extends XbrlFact>(facts: T[]): T | null {
  let best: T | null = null;
  for (const fact of facts) {
    if (!best || fact.end > best.end || (fact.end === best.end && fact.filed > best.filed)) {
      best = fact;
    }
  }
  return best;
}

function spans(fact: DurationFact, min: number, max: number) {
  const days = daySpan(fact.start, fact.end);
  return days >= min && days <= max;
}

/** Newest fact covering a full fiscal year. */
export function latestAnnual(facts: XbrlFact[]): DurationFact | null {
  return newest(facts.filter(isDuration).filter((f) => spans(f, ANNUAL_MIN_DAYS, ANNUAL_MAX_DAYS)));
}

/** Newest balance-sheet figure, e.g. cash or debt. */
export function latestInstant(facts: XbrlFact[]): XbrlFact | null {
  return newest(facts.filter((fact) => !isDuration(fact)));
}

/**
 * Newest single-quarter fact. Quarterly and year-to-date facts share an end
 * date, so the span filter is what tells them apart.
 */
export function latestQuarter(facts: XbrlFact[]): DurationFact | null {
  return newest(
    facts.filter(isDuration).filter((f) => spans(f, QUARTER_MIN_DAYS, QUARTER_MAX_DAYS)),
  );
}

/** One entry per period end, keeping whichever filing reported it last. */
function dedupeByEnd(facts: DurationFact[]): DurationFact[] {
  const byEnd = new Map<string, DurationFact>();
  for (const fact of facts) {
    const seen = byEnd.get(fact.end);
    if (!seen || fact.filed > seen.filed) byEnd.set(fact.end, fact);
  }
  return [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
}

/**
 * Fallback for issuers too young to have filed an annual report. Four quarters
 * only add up to a year if they actually abut, so a gap makes this give up
 * rather than return a number covering the wrong window.
 */
function sumTrailingQuarters(facts: DurationFact[]): number | null {
  const quarters = dedupeByEnd(
    facts.filter((f) => spans(f, QUARTER_MIN_DAYS, QUARTER_MAX_DAYS)),
  ).slice(-4);
  if (quarters.length < 4) return null;

  for (let i = 1; i < quarters.length; i++) {
    if (daySpan(quarters[i - 1].end, quarters[i].start) > ABUT_TOLERANCE_DAYS) return null;
  }
  return quarters.reduce((sum, fact) => sum + fact.val, 0);
}

/**
 * Trailing twelve months of a flow measure — revenue, EPS, cash flow.
 *
 * Summing the last four quarterly facts does not work: a company's fourth
 * quarter is never filed on its own, only inside the annual figure, so the naive
 * sum skips it and silently spans fifteen months. Roll the annual figure forward
 * by the year-to-date delta instead, which is how filings bridge it themselves.
 */
export function ttmFromFacts(facts: XbrlFact[]): number | null {
  const durations = facts.filter(isDuration);
  const annual = latestAnnual(durations);
  if (!annual) return sumTrailingQuarters(durations);

  // Year-to-date facts of the current fiscal year start right after the last one ended.
  const ytdNow = newest(
    durations.filter(
      (f) =>
        f.start > annual.end &&
        daySpan(annual.end, f.start) <= ABUT_TOLERANCE_DAYS &&
        daySpan(f.start, f.end) < ANNUAL_MIN_DAYS,
    ),
  );
  // No interim filing yet, so the annual figure *is* the trailing year.
  if (!ytdNow) return annual.val;

  const span = daySpan(ytdNow.start, ytdNow.end);
  const ytdPrior = newest(
    durations.filter((f) => f.start === annual.start && Math.abs(daySpan(f.start, f.end) - span) <= 10),
  );
  if (!ytdPrior) return annual.val;

  return annual.val + ytdNow.val - ytdPrior.val;
}

/**
 * Compound annual growth between the newest annual figure and the one `years`
 * earlier. Null unless both ends are positive, since the ratio is otherwise
 * meaningless for a growth rate.
 */
export function annualCagr(facts: XbrlFact[], years: number): number | null {
  const annuals = dedupeByEnd(
    facts.filter(isDuration).filter((f) => spans(f, ANNUAL_MIN_DAYS, ANNUAL_MAX_DAYS)),
  );
  const latest = annuals.at(-1);
  if (!latest || annuals.length < 2) return null;

  const targetSpan = years * 365;
  let older: DurationFact | null = null;
  let bestMiss = Number.POSITIVE_INFINITY;
  for (const candidate of annuals.slice(0, -1)) {
    const miss = Math.abs(daySpan(candidate.end, latest.end) - targetSpan);
    if (miss < bestMiss) {
      bestMiss = miss;
      older = candidate;
    }
  }
  // Demanding the window land within ~2 months keeps a 3-year gap out of a 5-year CAGR.
  if (!older || bestMiss > 60 || older.val <= 0 || latest.val <= 0) return null;

  return (Math.pow(latest.val / older.val, 1 / years) - 1) * 100;
}
