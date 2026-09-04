import {
  DRIVER_LIMITS,
  annualCagr,
  latestInstant,
  latestQuarter,
  ttmFromFacts,
  type DcfDrivers,
  type FilingRef,
  type XbrlFact,
} from "@mystockjournal/shared";
import { env } from "../env";

/**
 * SEC EDGAR client. Free and key-less, but every request needs a contact
 * `User-Agent` and callers are capped at 10 requests a second.
 *
 * Node's built-in fetch ignores `HTTPS_PROXY` unless `NODE_USE_ENV_PROXY=1` is
 * set, which the api dev script does — a machine that only reaches SEC through a
 * local proxy would otherwise see every request fail.
 */
const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts";
const ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data";

/** Stay well inside SEC's 10 req/s ceiling without needing a real rate limiter. */
const MIN_REQUEST_GAP_MS = 120;
const REQUEST_TIMEOUT_MS = 20_000;
/** Only annual and quarterly reports. Foreign issuers file 20-F/40-F and are not covered. */
const REPORT_FORMS = new Set(["10-K", "10-Q"]);
const MAX_FILING_LINKS = 6;

/** Revenue tag varies by filer and vintage; take the first that has facts. */
const REVENUE_TAGS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
];
const CASH_TAGS = ["CashAndCashEquivalentsAtCarryingValue"];
/** Filers split short-term investments across several tags; Apple uses none of the first two. */
const SHORT_TERM_INVESTMENT_TAGS = [
  "ShortTermInvestments",
  "AvailableForSaleSecuritiesDebtSecuritiesCurrent",
  "MarketableSecuritiesCurrent",
];
const NONCURRENT_DEBT_TAGS = ["LongTermDebtNoncurrent"];
/** `LongTermDebt` already includes the current portion, so it is a total, not an addend. */
const TOTAL_DEBT_TAGS = ["LongTermDebt"];
const CURRENT_DEBT_TAGS = ["LongTermDebtCurrent", "DebtCurrent"];
const DILUTED_SHARES_TAGS = ["WeightedAverageNumberOfDilutedSharesOutstanding"];
const DILUTED_EPS_TAGS = ["EarningsPerShareDiluted"];
const OPERATING_CASH_FLOW_TAGS = [
  "NetCashProvidedByUsedInOperatingActivities",
  "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
];
const CAPEX_TAGS = [
  "PaymentsToAcquirePropertyPlantAndEquipment",
  "PaymentsToAcquireProductiveAssets",
];

type CompanyFacts = {
  facts?: Record<string, Record<string, { units?: Record<string, XbrlFact[]> }>>;
};

type Submissions = {
  cik?: string;
  name?: string;
  filings?: {
    recent?: {
      form?: string[];
      filingDate?: string[];
      reportDate?: string[];
      accessionNumber?: string[];
      primaryDocument?: string[];
    };
  };
};

/** Extracted straight from filings. Everything else in an anchor set is an estimate. */
export type EdgarFundamentals = {
  cik: number;
  name: string | null;
  /** Last day covered by the newest figures, e.g. "2026-06-27". */
  asOf: string | null;
  ttmRevenue: number;
  cash: number;
  debt: number;
  shares: number;
  ttmEps: number | null;
  past5YCagr: number | null;
  /** Drivers we can ground in history. Judgment calls like WACC are left out. */
  observedDrivers: Partial<DcfDrivers>;
  sourceFilings: FilingRef[];
};

let lastRequestAt = 0;
let tickerToCik: Map<string, number> | null = null;

async function getJson<T>(url: string): Promise<T | null> {
  if (!env.secUserAgent) {
    console.warn("SEC_USER_AGENT is unset — skipping EDGAR fetch");
    return null;
  }

  const wait = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": env.secUserAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`EDGAR HTTP ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`EDGAR fetch failed for ${url}`, error);
    return null;
  }
}

/**
 * Ticker to CIK, which every other EDGAR endpoint keys on. The mapping covers
 * ~10k filers in one 800KB document, so it is held for the process lifetime.
 */
async function resolveCik(ticker: string): Promise<number | null> {
  if (!tickerToCik) {
    const raw = await getJson<Record<string, { cik_str?: number; ticker?: string }>>(TICKERS_URL);
    if (!raw) return null;
    const map = new Map<string, number>();
    for (const row of Object.values(raw)) {
      if (row?.ticker && typeof row.cik_str === "number") map.set(row.ticker.toUpperCase(), row.cik_str);
    }
    // Only cache a mapping that actually parsed, so one bad response is retried.
    if (map.size > 0) tickerToCik = map;
    return map.get(ticker) ?? null;
  }
  return tickerToCik.get(ticker) ?? null;
}

/** EDGAR paths use the CIK zero-padded to ten digits. */
function padCik(cik: number) {
  return String(cik).padStart(10, "0");
}

/**
 * Facts for whichever candidate tag a filer actually keeps current.
 *
 * Picking the first tag that has any facts is wrong: NVIDIA still carries
 * `RevenueFromContractWithCustomer...` but stopped updating it after FY2022,
 * having moved to `Revenues`. Choosing the tag with the most recent period keeps
 * one internally consistent series instead of merging two that disagree.
 */
function factsFor(
  companyFacts: CompanyFacts,
  tags: string[],
  unit: string,
  taxonomy = "us-gaap",
): XbrlFact[] {
  const table = companyFacts.facts?.[taxonomy];
  if (!table) return [];

  let best: XbrlFact[] = [];
  let bestEnd = "";
  for (const tag of tags) {
    const facts = table[tag]?.units?.[unit];
    if (!facts || facts.length === 0) continue;
    const latestEnd = facts.reduce((max, fact) => (fact.end > max ? fact.end : max), "");
    // Strict comparison keeps the declared tag order when two are equally current.
    if (latestEnd > bestEnd) {
      best = facts;
      bestEnd = latestEnd;
    }
  }
  return best;
}

/** Instant figure in whole dollars, or 0 when no tag in the list reported one. */
function instantValue(companyFacts: CompanyFacts, tags: string[]): number {
  return latestInstant(factsFor(companyFacts, tags, "USD"))?.val ?? 0;
}

/**
 * Total interest-bearing debt. Filers tag this two ways: a non-current balance
 * that needs the current portion added, or `LongTermDebt`, which is already the
 * combined figure. Adding the current portion to the latter would double-count
 * it, so the two paths are kept separate.
 */
function totalDebt(companyFacts: CompanyFacts): number {
  const current = instantValue(companyFacts, CURRENT_DEBT_TAGS);
  const noncurrent = instantValue(companyFacts, NONCURRENT_DEBT_TAGS);
  if (noncurrent > 0) return noncurrent + current;

  // Taking the larger covers a filer that reports only a total, or only a
  // current balance, without assuming which of the two exists.
  return Math.max(instantValue(companyFacts, TOTAL_DEBT_TAGS), current);
}

function recentFilings(submissions: Submissions, cik: number): FilingRef[] {
  const recent = submissions.filings?.recent;
  if (!recent?.form) return [];

  const { form, filingDate = [], reportDate = [], accessionNumber = [], primaryDocument = [] } = recent;
  const refs: FilingRef[] = [];

  for (let i = 0; i < form.length && refs.length < MAX_FILING_LINKS; i++) {
    const type = form[i];
    const accession = accessionNumber[i];
    const document = primaryDocument[i];
    if (!REPORT_FORMS.has(type) || !accession || !document) continue;

    refs.push({
      form: type,
      filingDate: filingDate[i] ?? "",
      reportDate: reportDate[i] ?? "",
      url: `${ARCHIVES_URL}/${cik}/${accession.replace(/-/g, "")}/${document}`,
    });
  }
  return refs;
}

/**
 * The two drivers history can actually speak to: this year's FCF margin and the
 * near-term growth rate. Terminal margin, later-year growth, WACC and terminal
 * growth are forward-looking judgments, so they are left to the caller's
 * defaults rather than extrapolated from one period.
 *
 * `ttmRevenue` is in whole dollars here, matching the cash-flow facts. A filer
 * outspending its operating cash flow lands on the floor of zero, which reads as
 * "set this yourself" rather than implying a margin we did not observe.
 */
function observedDrivers(companyFacts: CompanyFacts, ttmRevenue: number, past5YCagr: number | null) {
  const drivers: Partial<DcfDrivers> = {};

  const operatingCashFlow = ttmFromFacts(factsFor(companyFacts, OPERATING_CASH_FLOW_TAGS, "USD"));
  const capex = ttmFromFacts(factsFor(companyFacts, CAPEX_TAGS, "USD"));
  if (operatingCashFlow != null && ttmRevenue > 0) {
    // Capex is filed as a positive outflow, so it subtracts.
    const margin = ((operatingCashFlow - (capex ?? 0)) / ttmRevenue) * 100;
    drivers.fcfMarginY1 = round1(clamp(margin, DRIVER_LIMITS.fcfMarginY1));
  }

  if (past5YCagr != null) {
    drivers.growthY1_5 = round1(clamp(past5YCagr, DRIVER_LIMITS.growthY1_5));
  }

  return drivers;
}

function clamp(value: number, limits: { min: number; max: number }) {
  return Math.min(limits.max, Math.max(limits.min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** EPS is summed across quarters, so trim the floating-point tail. */
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Filings report dollars; the valuation model works in millions. */
function toMillions(value: number) {
  return Math.round((value / 1e6) * 10) / 10;
}

/**
 * Pull the figures a DCF starts from out of a company's filings. Returns null
 * when the ticker is not an EDGAR filer or the response lacked the two figures
 * the equity bridge divides by.
 */
export async function fetchEdgarFundamentals(ticker: string): Promise<EdgarFundamentals | null> {
  const cik = await resolveCik(ticker);
  if (cik == null) return null;

  const padded = padCik(cik);
  const [companyFacts, submissions] = await Promise.all([
    getJson<CompanyFacts>(`${FACTS_URL}/CIK${padded}.json`),
    getJson<Submissions>(`${SUBMISSIONS_URL}/CIK${padded}.json`),
  ]);
  if (!companyFacts) return null;

  const revenueFacts = factsFor(companyFacts, REVENUE_TAGS, "USD");
  const ttmRevenue = ttmFromFacts(revenueFacts);
  const sharesFact = latestQuarter(factsFor(companyFacts, DILUTED_SHARES_TAGS, "shares"));

  // Without revenue and a share count there is no DCF to run.
  if (ttmRevenue == null || ttmRevenue <= 0 || !sharesFact || sharesFact.val <= 0) return null;

  const past5YCagr = annualCagr(revenueFacts, 5);
  const ttmEps = ttmFromFacts(factsFor(companyFacts, DILUTED_EPS_TAGS, "USD/shares"));

  return {
    cik,
    name: submissions?.name ?? null,
    asOf: sharesFact.end,
    ttmRevenue: toMillions(ttmRevenue),
    cash: toMillions(
      instantValue(companyFacts, CASH_TAGS) + instantValue(companyFacts, SHORT_TERM_INVESTMENT_TAGS),
    ),
    debt: toMillions(totalDebt(companyFacts)),
    shares: toMillions(sharesFact.val),
    ttmEps: ttmEps == null ? null : round2(ttmEps),
    past5YCagr: past5YCagr == null ? null : round1(past5YCagr),
    observedDrivers: observedDrivers(companyFacts, ttmRevenue, past5YCagr),
    sourceFilings: submissions ? recentFilings(submissions, cik) : [],
  };
}
