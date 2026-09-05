import { eq } from "drizzle-orm";
import type { DcfDrivers, FilingRef, PePoint, ValuationAnchors } from "@mystockjournal/shared";
import { db } from "../db";
import { fundamentalsCache } from "../db/schema";
import { fetchEdgarFundamentals } from "./edgar";

/**
 * Valuation anchors, resolved in order: `fundamentals_cache`, then SEC EDGAR,
 * then a small bundled dataset. Statement figures come from filings; forward EPS
 * and P/E history cannot (they need analyst estimates and price history), so
 * those stay bundled and are simply absent for tickers we have not curated.
 */
type BundledAnchors = Omit<ValuationAnchors, "available" | "sourceFilings">;

/** Refetch weekly. Filings land quarterly, but a 10-Q can arrive any day. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Bump when the cached payload shape or merge rules change so stale rows are
 * refetched instead of serving week-old driver prefills.
 */
const CACHE_VERSION = 2;

/** Neutral drivers for a ticker we have no estimate for. The user must review them. */
const FALLBACK_DRIVERS: DcfDrivers = {
  growthY1_5: 10,
  growthY6_10: 6,
  termGrowth: 3,
  wacc: 9,
  fcfMarginY1: 15,
  fcfMarginTerm: 18,
};

/** AAPL forward P/E by year. 2023 EPS declined, which is why its PEG breaks. */
const AAPL_PE_HISTORY: PePoint[] = [
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

const GOOGL_PE_HISTORY: PePoint[] = [
  { year: 2015, pe: 21.4, growth: 12 },
  { year: 2016, pe: 21.9, growth: 18 },
  { year: 2017, pe: 24.6, growth: 26 },
  { year: 2018, pe: 22.1, growth: 27 },
  { year: 2019, pe: 24.3, growth: 12 },
  { year: 2020, pe: 30.2, growth: 19 },
  { year: 2021, pe: 26.4, growth: 91 },
  { year: 2022, pe: 17.9, growth: -19 },
  { year: 2023, pe: 21.6, growth: 27 },
  { year: 2024, pe: 22.8, growth: 38 },
  { year: 2025, pe: 20.1, growth: 14 },
];

const NVDA_PE_HISTORY: PePoint[] = [
  { year: 2018, pe: 32.4, growth: 35 },
  { year: 2019, pe: 24.8, growth: -33 },
  { year: 2020, pe: 46.2, growth: 53 },
  { year: 2021, pe: 55.1, growth: 123 },
  { year: 2022, pe: 42.7, growth: -55 },
  { year: 2023, pe: 61.5, growth: 288 },
  { year: 2024, pe: 44.3, growth: 145 },
  { year: 2025, pe: 33.8, growth: 42 },
];

const DDOG_PE_HISTORY: PePoint[] = [
  { year: 2021, pe: 148.0, growth: 60 },
  { year: 2022, pe: 96.4, growth: 48 },
  { year: 2023, pe: 74.2, growth: 35 },
  { year: 2024, pe: 68.5, growth: 28 },
  { year: 2025, pe: 61.3, growth: 22 },
];

/** Revenue, cash, and debt in $M; share counts in millions, as filings report them. */
const BUNDLED: Record<string, BundledAnchors> = {
  AAPL: {
    // The annual FY2025 figure, not a trailing twelve months — EDGAR supersedes it.
    period: "FY2025",
    ttmRevenue: 416_000,
    cash: 132_000,
    debt: 98_000,
    shares: 14_900,
    past5YCagr: 7.5,
    ttmEps: 6.43,
    fwdEps: 9.38,
    peHistory: AAPL_PE_HISTORY,
    drivers: {
      growthY1_5: 7,
      growthY6_10: 4,
      termGrowth: 2.5,
      wacc: 8.5,
      fcfMarginY1: 27,
      fcfMarginTerm: 29,
    },
  },
  GOOGL: {
    period: "TTM FY2025",
    ttmRevenue: 371_000,
    cash: 98_000,
    debt: 28_000,
    shares: 12_200,
    past5YCagr: 15.4,
    ttmEps: 9.1,
    fwdEps: 10.5,
    peHistory: GOOGL_PE_HISTORY,
    drivers: {
      growthY1_5: 11,
      growthY6_10: 6,
      termGrowth: 3,
      wacc: 8.5,
      fcfMarginY1: 22,
      fcfMarginTerm: 26,
    },
  },
  MSFT: {
    period: "TTM FY2026",
    ttmRevenue: 300_000,
    cash: 95_000,
    debt: 60_000,
    shares: 7450,
    past5YCagr: 14.2,
    ttmEps: 13.6,
    fwdEps: 15.8,
    peHistory: [
      { year: 2018, pe: 24.6, growth: 18 },
      { year: 2019, pe: 26.4, growth: 21 },
      { year: 2020, pe: 32.1, growth: 14 },
      { year: 2021, pe: 34.8, growth: 40 },
      { year: 2022, pe: 26.2, growth: 16 },
      { year: 2023, pe: 31.4, growth: -1 },
      { year: 2024, pe: 34.6, growth: 22 },
      { year: 2025, pe: 30.9, growth: 15 },
    ],
    drivers: {
      growthY1_5: 12,
      growthY6_10: 7,
      termGrowth: 3,
      wacc: 8.5,
      fcfMarginY1: 25,
      fcfMarginTerm: 28,
    },
  },
  META: {
    period: "TTM FY2025",
    ttmRevenue: 195_000,
    cash: 47_000,
    debt: 30_000,
    shares: 2540,
    past5YCagr: 17.8,
    ttmEps: 25.6,
    fwdEps: 28.4,
    peHistory: [
      { year: 2018, pe: 19.6, growth: 39 },
      { year: 2019, pe: 22.4, growth: -16 },
      { year: 2020, pe: 26.1, growth: 58 },
      { year: 2021, pe: 23.4, growth: 36 },
      { year: 2022, pe: 12.8, growth: -38 },
      { year: 2023, pe: 22.6, growth: 73 },
      { year: 2024, pe: 25.9, growth: 60 },
      { year: 2025, pe: 23.3, growth: 12 },
    ],
    drivers: {
      growthY1_5: 12,
      growthY6_10: 6,
      termGrowth: 3,
      wacc: 9,
      fcfMarginY1: 26,
      fcfMarginTerm: 28,
    },
  },
  NVDA: {
    period: "TTM FY2026",
    ttmRevenue: 165_000,
    cash: 43_000,
    debt: 10_000,
    shares: 24_800,
    past5YCagr: 64.8,
    ttmEps: 3.1,
    fwdEps: 4.5,
    peHistory: NVDA_PE_HISTORY,
    drivers: {
      growthY1_5: 28,
      growthY6_10: 10,
      termGrowth: 3.5,
      wacc: 10,
      fcfMarginY1: 45,
      fcfMarginTerm: 38,
    },
  },
  // The figures the design spec's DCF walkthrough reconciles against.
  DDOG: {
    period: "TTM Q2 FY2026",
    ttmRevenue: 3966.7,
    cash: 3200,
    debt: 800,
    shares: 325,
    past5YCagr: 39.2,
    ttmEps: 1.2,
    fwdEps: 1.85,
    peHistory: DDOG_PE_HISTORY,
    drivers: {
      growthY1_5: 20,
      growthY6_10: 12,
      termGrowth: 4,
      wacc: 9,
      fcfMarginY1: 25,
      fcfMarginTerm: 33,
    },
  },
};

function unavailableAnchors(): ValuationAnchors {
  return {
    available: false,
    period: null,
    sourceFilings: [],
    ttmRevenue: 0,
    cash: 0,
    debt: 0,
    shares: 0,
    past5YCagr: null,
    ttmEps: null,
    fwdEps: null,
    peHistory: [],
    drivers: FALLBACK_DRIVERS,
  };
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asPeHistory(value: unknown): PePoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const point = row as { year?: unknown; pe?: unknown; growth?: unknown };
      const year = num(point.year);
      const pe = num(point.pe);
      const growth = num(point.growth);
      if (year == null || pe == null || growth == null) return null;
      return { year, pe, growth };
    })
    .filter((point): point is PePoint => point != null)
    .sort((a, b) => a.year - b.year);
}

function asDrivers(value: unknown): DcfDrivers {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const pick = (key: keyof DcfDrivers) => num(row[key]) ?? FALLBACK_DRIVERS[key];
  return {
    growthY1_5: pick("growthY1_5"),
    growthY6_10: pick("growthY6_10"),
    termGrowth: pick("termGrowth"),
    wacc: pick("wacc"),
    fcfMarginY1: pick("fcfMarginY1"),
    fcfMarginTerm: pick("fcfMarginTerm"),
  };
}

function asFilings(value: unknown): FilingRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const ref = row as Record<string, unknown>;
      if (typeof ref.url !== "string" || typeof ref.form !== "string") return null;
      // Only SEC archive links are rendered as anchors, so reject anything else.
      if (!ref.url.startsWith("https://www.sec.gov/")) return null;
      return {
        form: ref.form,
        filingDate: typeof ref.filingDate === "string" ? ref.filingDate : "",
        reportDate: typeof ref.reportDate === "string" ? ref.reportDate : "",
        url: ref.url,
      };
    })
    .filter((ref): ref is FilingRef => ref != null);
}

/** A cached payload is only usable if the figures the EV bridge divides by are present. */
function asAnchors(payload: unknown, period: string | null): ValuationAnchors | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const ttmRevenue = num(row.ttmRevenue);
  const shares = num(row.shares);
  if (ttmRevenue == null || ttmRevenue <= 0 || shares == null || shares <= 0) return null;

  return {
    available: true,
    period,
    sourceFilings: asFilings(row.sourceFilings),
    ttmRevenue,
    cash: num(row.cash) ?? 0,
    debt: num(row.debt) ?? 0,
    shares,
    past5YCagr: num(row.past5YCagr),
    ttmEps: num(row.ttmEps),
    fwdEps: num(row.fwdEps),
    peHistory: asPeHistory(row.peHistory),
    drivers: asDrivers(row.drivers),
  };
}

/** Cached anchors, plus whether they are recent enough to serve without refetching. */
async function readCache(ticker: string): Promise<{ anchors: ValuationAnchors; fresh: boolean } | null> {
  try {
    const rows = await db
      .select()
      .from(fundamentalsCache)
      .where(eq(fundamentalsCache.ticker, ticker))
      .limit(1);
    if (!rows[0]) return null;

    const anchors = asAnchors(rows[0].payload, rows[0].period);
    if (!anchors) return null;
    const payload = rows[0].payload as Record<string, unknown>;
    const versionOk = num(payload.cacheVersion) === CACHE_VERSION;
    const fresh = versionOk && Date.now() - rows[0].fetchedAt.getTime() < CACHE_TTL_MS;
    return { anchors, fresh };
  } catch (error) {
    console.warn("fundamentals cache read failed", error);
    return null;
  }
}

async function writeCache(ticker: string, anchors: Omit<ValuationAnchors, "available">) {
  try {
    const { period, ...rest } = anchors;
    const payload = { ...rest, cacheVersion: CACHE_VERSION };
    await db
      .insert(fundamentalsCache)
      .values({ ticker, payload, period, fetchedAt: new Date() })
      .onConflictDoUpdate({
        target: fundamentalsCache.ticker,
        set: { payload, period, fetchedAt: new Date() },
      });
  } catch (error) {
    console.warn("fundamentals cache write failed", error);
  }
}

/**
 * Merge filing figures with the parts EDGAR cannot supply. Forward EPS needs an
 * analyst estimate and P/E history needs price history, so both come from the
 * bundled set when we have curated one.
 *
 * Driver merge order: neutral default → curated judgment → filing-observed.
 * Observed keys today are only `fcfMarginY1` and `growthY1_5`; when present they
 * must win so Assumptions prefill from the statements, not the curated guess.
 */
function anchorsFromEdgar(
  edgar: NonNullable<Awaited<ReturnType<typeof fetchEdgarFundamentals>>>,
  bundled: BundledAnchors | undefined,
): ValuationAnchors {
  return {
    available: true,
    period: edgar.asOf ? `TTM through ${edgar.asOf}` : (bundled?.period ?? null),
    sourceFilings: edgar.sourceFilings,
    ttmRevenue: edgar.ttmRevenue,
    cash: edgar.cash,
    debt: edgar.debt,
    shares: edgar.shares,
    past5YCagr: edgar.past5YCagr ?? bundled?.past5YCagr ?? null,
    ttmEps: edgar.ttmEps ?? bundled?.ttmEps ?? null,
    fwdEps: bundled?.fwdEps ?? null,
    peHistory: bundled?.peHistory ?? [],
    drivers: {
      ...FALLBACK_DRIVERS,
      ...bundled?.drivers,
      ...edgar.observedDrivers,
    },
  };
}

/**
 * Anchors for a ticker. Returns `available: false` when no filing or bundled
 * figures exist, which tells the valuation page to accept manual entry instead.
 */
export async function getAnchors(rawTicker: string): Promise<ValuationAnchors> {
  const ticker = rawTicker.trim().toUpperCase();

  const cached = await readCache(ticker);
  if (cached?.fresh) return cached.anchors;

  const bundled = BUNDLED[ticker];
  const edgar = await fetchEdgarFundamentals(ticker);
  if (edgar) {
    const anchors = anchorsFromEdgar(edgar, bundled);
    await writeCache(ticker, anchors);
    return anchors;
  }

  // EDGAR was unreachable or does not cover this filer. Stale cache beats nothing.
  if (cached) return cached.anchors;
  if (!bundled) return unavailableAnchors();

  const anchors: ValuationAnchors = { available: true, sourceFilings: [], ...bundled };
  await writeCache(ticker, anchors);
  return anchors;
}
