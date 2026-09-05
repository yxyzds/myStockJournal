"use client";

import { useMemo, useState } from "react";
import {
  DRIVER_LIMITS,
  valueRdcf,
  type DcfInputs,
  type DcfYearRow,
  type FilingRef,
  type RdcfInputs,
} from "@mystockjournal/shared";
import type { MethodViewProps } from "./actions";
import {
  AnchorRow,
  Card,
  CardHeader,
  ChallengeCard,
  Chevron,
  FilingSourceNote,
  NumberInput,
  fmt1,
  fmt2,
  fmtMoneyM,
  fmtPct,
  type Challenge,
} from "./primitives";

const HELD_DRIVERS = [
  { key: "wacc", label: "WACC (discount rate)" },
  { key: "termGrowth", label: "Terminal growth (g)" },
  { key: "fcfMarginY1", label: "FCF margin Y1" },
  { key: "fcfMarginTerm", label: "FCF margin terminal" },
  { key: "growthY6_10", label: "Revenue growth Y6–10 (rule)" },
] as const satisfies readonly { key: keyof RdcfInputs; label: string }[];

export type RdcfViewProps = MethodViewProps & {
  assumptions: RdcfInputs;
  onChange: (assumptions: RdcfInputs) => void;
  /** The user's own DCF drivers, so the market's growth can be compared to theirs. */
  dcfBaseline: DcfInputs;
  onOpenDcf: () => void;
};

export function RdcfView({
  anchors,
  currentPrice,
  ticker,
  assumptions,
  onChange,
  dcfBaseline,
  onOpenDcf,
  actions,
}: RdcfViewProps) {
  const result = useMemo(() => valueRdcf(assumptions, currentPrice), [assumptions, currentPrice]);
  const implied = result.impliedGrowthY1_5;
  const challenges = useRdcfChallenges(implied, dcfBaseline.growthY1_5, ticker);

  function setField<K extends keyof RdcfInputs>(key: K, value: RdcfInputs[K]) {
    onChange({ ...assumptions, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <HeroSection
        implied={implied}
        assumptions={assumptions}
        currentPrice={currentPrice}
        targetEv={result.targetEv}
        baselineGrowth={dcfBaseline.growthY1_5}
      />

      <ComparisonSection
        implied={implied}
        assumptions={assumptions}
        dcfBaseline={dcfBaseline}
        onOpenDcf={onOpenDcf}
      />

      <HeldConstantsSection
        assumptions={assumptions}
        anchorsAvailable={anchors.available}
        anchorPeriod={anchors.period}
        sourceFilings={anchors.sourceFilings}
        past5YCagr={anchors.past5YCagr}
        currentPrice={currentPrice}
        onField={setField}
      />

      <MarketBridgeSection
        assumptions={assumptions}
        currentPrice={currentPrice}
        marketCap={result.marketCap}
        targetEv={result.targetEv}
        ev={result.ev}
        pvFcfs={result.pvFcfs}
        pvTv={result.pvTv}
      />

      {result.rows.length > 0 && <ForecastSection rows={result.rows} tv={result.tv} />}

      <ChallengeCard challenges={challenges} />

      <div className="flex flex-wrap justify-end gap-2 pb-2">
        <button
          type="button"
          onClick={onOpenDcf}
          className="rounded-[9px] bg-slate-100 px-3.5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-200"
        >
          Open in DCF →
        </button>
        <button
          type="button"
          onClick={actions.onSave}
          disabled={actions.saving}
          className="rounded-[9px] bg-slate-900 px-3.5 py-2 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {actions.saved ? "Saved ✓" : actions.saving ? "Saving…" : "Save this model"}
        </button>
      </div>
    </div>
  );
}

/** Reverse DCF has no fair value, so the critique is about the growth gap itself. */
function useRdcfChallenges(
  implied: number | null,
  baselineGrowth: number,
  ticker: string,
): Challenge[] {
  return useMemo(() => {
    if (implied == null) {
      return [
        {
          field: "No solution",
          note: "No growth rate reconciles this price to your held-constant inputs",
          bullets: [
            "Terminal growth may be at or above WACC, leaving terminal value undefined",
            "Or the price implies growth beyond any plausible range",
          ],
          question: "Which held-constant input is doing the damage?",
        },
      ];
    }

    const gap = implied - baselineGrowth;
    if (Math.abs(gap) < 1) {
      return [
        {
          field: "Aligned with your base case",
          note: `Market implies ${fmtPct(implied)} against your ${fmtPct(baselineGrowth)}`,
          bullets: ["Price and your model agree on the growth path, within a percentage point"],
          question: "If you and the market agree, where is your edge?",
        },
      ];
    }

    return gap > 0
      ? [
          {
            field: "Market implies faster growth",
            note: `${fmtPct(implied)} vs. your ${fmtPct(baselineGrowth)} — ${fmt1(gap)}pp higher`,
            bullets: [
              `Buying here means underwriting growth you do not currently forecast for ${ticker}`,
              "The gap is optimism you are paying for, not margin of safety",
            ],
            question: "What would have to be true for the market's path to happen?",
          },
        ]
      : [
          {
            field: "Market implies slower growth",
            note: `${fmtPct(implied)} vs. your ${fmtPct(baselineGrowth)} — ${fmt1(Math.abs(gap))}pp lower`,
            bullets: [
              "Either the market is discounting a risk your model omits, or this is your margin of safety",
              "Reverse DCF cannot tell the two apart — only evidence can",
            ],
            question: "Which risk might the market see that your model does not?",
          },
        ];
  }, [implied, baselineGrowth, ticker]);
}

function HeroSection({
  implied,
  assumptions,
  currentPrice,
  targetEv,
  baselineGrowth,
}: {
  implied: number | null;
  assumptions: RdcfInputs;
  currentPrice: number;
  targetEv: number;
  baselineGrowth: number;
}) {
  const faster = implied != null && implied > baselineGrowth;

  return (
    <Card className="rounded-[16px]">
      <div className="bg-slate-900 px-6 py-2.5">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          What is the market pricing in?
        </span>
      </div>

      <div className="px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start gap-6 md:gap-8">
          <div>
            <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              Current price
            </p>
            <span className="font-mono text-[32px] font-bold text-slate-800 tabular-nums">
              ${fmt2(currentPrice)}
            </span>
          </div>

          <div className="mt-[18px] hidden text-[28px] text-slate-200 select-none md:block">→</div>

          <div>
            <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              Implied revenue CAGR · Y1–5
            </p>
            <span
              className={`font-mono text-[44px] leading-none font-bold tabular-nums md:text-[56px] ${
                implied == null ? "text-slate-300" : faster ? "text-amber-500" : "text-blue-600"
              }`}
            >
              {implied == null ? "—" : fmtPct(implied)}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 md:ml-auto">
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="mb-[3px] text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                Y6–10 rule (held)
              </p>
              <span className="font-mono text-[18px] font-bold text-slate-700 tabular-nums">
                {fmtPct(assumptions.growthY6_10)}
              </span>
            </div>
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="mb-[3px] text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                Target EV
              </p>
              <span className="font-mono text-[18px] font-bold text-slate-700 tabular-nums">
                {fmtMoneyM(targetEv)}
              </span>
            </div>
          </div>
        </div>

        <div
          className={`mt-4 rounded-[10px] border px-4 py-2.5 ${
            implied == null
              ? "border-slate-200 bg-slate-50"
              : faster
                ? "border-amber-100 bg-amber-50"
                : "border-blue-100 bg-blue-50"
          }`}
        >
          {implied == null ? (
            <p className="text-[13px] leading-relaxed text-slate-600">
              No growth rate reconciles ${fmt2(currentPrice)} to these held-constant inputs. Check
              that WACC comfortably exceeds terminal growth.
            </p>
          ) : (
            <p
              className={`text-[13px] leading-relaxed ${faster ? "text-amber-800" : "text-blue-800"}`}
            >
              At <strong>${fmt2(currentPrice)}</strong>, the market is implying approximately{" "}
              <strong>{fmtPct(implied)}</strong> revenue growth over the next five years — given your
              held-constant FCF margins ({fmtPct(assumptions.fcfMarginY1)} →{" "}
              {fmtPct(assumptions.fcfMarginTerm)}), WACC {fmtPct(assumptions.wacc)}, and terminal
              growth {fmtPct(assumptions.termGrowth)}.
              {faster
                ? " That is faster than your DCF base assumption."
                : " That is slower than your DCF base assumption."}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function ComparisonSection({
  implied,
  assumptions,
  dcfBaseline,
  onOpenDcf,
}: {
  implied: number | null;
  assumptions: RdcfInputs;
  dcfBaseline: DcfInputs;
  onOpenDcf: () => void;
}) {
  const faster = implied != null && implied > dcfBaseline.growthY1_5;

  const rows = [
    {
      label: "Revenue CAGR Y1–5",
      market: implied == null ? "—" : fmtPct(implied),
      yours: fmtPct(dcfBaseline.growthY1_5),
      solved: true,
    },
    {
      label: "Revenue growth Y6–10",
      market: `${fmtPct(assumptions.growthY6_10)} (rule)`,
      yours: fmtPct(dcfBaseline.growthY6_10),
    },
    {
      label: "FCF margin Y1",
      market: `${fmtPct(assumptions.fcfMarginY1)} (held)`,
      yours: fmtPct(dcfBaseline.fcfMarginY1),
    },
    {
      label: "FCF margin terminal",
      market: `${fmtPct(assumptions.fcfMarginTerm)} (held)`,
      yours: fmtPct(dcfBaseline.fcfMarginTerm),
    },
    {
      label: "WACC",
      market: `${fmtPct(assumptions.wacc)} (held)`,
      yours: fmtPct(dcfBaseline.wacc),
    },
    {
      label: "Terminal growth",
      market: `${fmtPct(assumptions.termGrowth)} (held)`,
      yours: fmtPct(dcfBaseline.termGrowth),
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Market-implied vs. my DCF base"
        subtitle="Only growth differs — every other input is held constant"
        right={
          implied == null ? null : (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${faster ? "bg-amber-50" : "bg-blue-50"}`}
            >
              <div className={`size-1.5 rounded-full ${faster ? "bg-amber-400" : "bg-blue-400"}`} />
              <span
                className={`text-[11px] font-semibold ${faster ? "text-amber-700" : "text-blue-700"}`}
              >
                {faster ? "Market implies faster growth" : "Market implies slower growth"}
              </span>
            </div>
          )
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {["", "Market-implied", "My DCF base"].map((heading, index) => (
                <th key={index} className="px-5 py-2 text-left">
                  <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    {heading}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-2.5">
                  <span
                    className={`text-[12px] ${row.solved ? "font-bold text-slate-800" : "text-slate-500"}`}
                  >
                    {row.label}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <span
                    className={`font-mono text-[12px] font-semibold tabular-nums ${
                      row.solved ? (faster ? "text-amber-500" : "text-blue-600") : "text-slate-400"
                    }`}
                  >
                    {row.market}
                  </span>
                </td>
                <td className="px-5 py-2.5">
                  <span
                    className={`font-mono text-[12px] font-semibold tabular-nums ${
                      row.solved ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {row.yours}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={onOpenDcf}
          className="rounded-[7px] bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
        >
          Edit my assumptions in DCF
        </button>
      </div>
    </Card>
  );
}

function HeldConstantsSection({
  assumptions,
  anchorsAvailable,
  anchorPeriod,
  sourceFilings,
  past5YCagr,
  currentPrice,
  onField,
}: {
  assumptions: RdcfInputs;
  anchorsAvailable: boolean;
  anchorPeriod: string | null;
  sourceFilings: FilingRef[];
  past5YCagr: number | null;
  currentPrice: number;
  onField: <K extends keyof RdcfInputs>(key: K, value: RdcfInputs[K]) => void;
}) {
  // Filed figures are facts, so they are only typed in when no filing covered the ticker.
  const manualEntry = !anchorsAvailable;

  return (
    <Card>
      <CardHeader
        title="Held-constant inputs"
        subtitle="Changing these changes the growth needed to justify today's price"
      />

      <div className="flex flex-col gap-4 p-5 md:flex-row">
        <div className="flex-1 rounded-[10px] border border-slate-100 bg-slate-50 p-3.5">
          <div className="mb-2.5">
            <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              Anchors
            </span>
            <div className="mt-px">
              {manualEntry ? (
                <p className="text-[10px] text-slate-400">
                  No filing data — enter the figures yourself
                </p>
              ) : (
                <FilingSourceNote period={anchorPeriod} filings={sourceFilings} />
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <AnchorRow
              label="TTM revenue"
              display={`$${assumptions.ttmRevenue.toLocaleString()}M`}
              editable={manualEntry}
              value={assumptions.ttmRevenue}
              limits={{ min: 0.01, max: 1e7, step: 1 }}
              onChange={(v) => onField("ttmRevenue", v)}
            />
            <AnchorRow
              label="Cash & investments"
              display={`$${assumptions.cash.toLocaleString()}M`}
              editable={manualEntry}
              value={assumptions.cash}
              limits={{ min: 0, max: 1e7, step: 1 }}
              onChange={(v) => onField("cash", v)}
            />
            <AnchorRow
              label="Total debt"
              display={`$${assumptions.debt.toLocaleString()}M`}
              editable={manualEntry}
              value={assumptions.debt}
              limits={{ min: 0, max: 1e7, step: 1 }}
              onChange={(v) => onField("debt", v)}
            />
            <AnchorRow
              label="Diluted shares"
              display={`${assumptions.shares.toLocaleString()}M`}
              editable={manualEntry}
              value={assumptions.shares}
              limits={{ min: 0.0001, max: 1e6, step: 1 }}
              onChange={(v) => onField("shares", v)}
            />
            <AnchorRow
              label="Current market price"
              display={`$${fmt2(currentPrice)}`}
              note="Locked — this is what the model solves from"
            />
            {past5YCagr != null && (
              <AnchorRow
                label="Past 5Y revenue CAGR"
                display={fmtPct(past5YCagr)}
                note="Reference only · not used in the model"
              />
            )}
          </div>

          <p className="mt-2.5 border-t border-slate-200 pt-2 text-[10px] leading-snug text-slate-400 italic">
            Cash and debt are not part of yearly FCF. They convert enterprise value into equity
            value.
          </p>
        </div>

        <div className="flex-1 rounded-[10px] border border-blue-100 bg-white p-3.5">
          <div className="mb-2.5">
            <span className="text-[11px] font-bold tracking-wide text-blue-700 uppercase">
              Held-constant drivers
            </span>
            <p className="mt-px text-[10px] text-blue-400">
              Edit to see how the implied growth moves
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {HELD_DRIVERS.map((driver) => (
              <div key={driver.key} className="flex items-center justify-between gap-3">
                <span className="flex-1 text-[11px] text-slate-600">{driver.label}</span>
                <div className="flex items-center gap-1 rounded-[7px] border border-slate-200 bg-white px-2 py-1 focus-within:border-blue-300">
                  <NumberInput
                    value={assumptions[driver.key]}
                    limits={DRIVER_LIMITS[driver.key]}
                    onCommit={(value) => onField(driver.key, value)}
                    ariaLabel={driver.label}
                    className="w-12 text-right text-[12px] font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MarketBridgeSection({
  assumptions,
  currentPrice,
  marketCap,
  targetEv,
  ev,
  pvFcfs,
  pvTv,
}: {
  assumptions: RdcfInputs;
  currentPrice: number;
  marketCap: number;
  targetEv: number;
  ev: number;
  pvFcfs: number;
  pvTv: number;
}) {
  const [open, setOpen] = useState(false);

  const chain = [
    {
      label: "Current price",
      value: `$${fmt2(currentPrice)}`,
      note: `× ${assumptions.shares.toLocaleString()}M shares`,
    },
    { label: "= Market cap", value: fmtMoneyM(marketCap) },
    { label: "− Cash & investments", value: `(${fmtMoneyM(assumptions.cash)})`, negative: true },
    { label: "+ Total debt", value: fmtMoneyM(assumptions.debt) },
    { label: "= Target EV", value: fmtMoneyM(targetEv), strong: true },
  ];

  return (
    <Card>
      <CardHeader title="Market-price bridge" subtitle="How today's price maps to an implied EV" />

      <div className="px-5 py-4 md:px-6">
        {chain.map((row, index) => (
          <div
            key={row.label}
            className={`flex items-center justify-between gap-3 py-1.5 ${
              index > 0 ? "border-t border-slate-50" : ""
            } ${row.strong ? "mt-0.5 border-t-2 border-slate-200 pt-2" : ""}`}
          >
            <span className={`text-[12px] ${row.strong ? "font-bold text-slate-900" : "text-slate-500"}`}>
              {row.label}
              {row.note && <span className="ml-1.5 text-[10px] text-slate-400">{row.note}</span>}
            </span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                row.strong
                  ? "text-[14px] font-bold text-slate-900"
                  : row.negative
                    ? "text-[12px] text-red-500"
                    : "text-[12px] text-slate-700"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}

        {ev > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="mt-2 flex w-full items-center gap-1.5 border-t border-dashed border-slate-200 pt-2 text-[11px] font-semibold text-slate-400 hover:text-blue-600"
            >
              <Chevron open={open} />
              {open ? "Hide EV breakdown" : "Show EV breakdown (PV FCFs + PV terminal value)"}
            </button>

            {open && (
              <div className="mt-2 flex flex-col gap-1 pl-3">
                {[
                  { label: "PV of projected FCFs (Y1–10)", value: pvFcfs },
                  { label: "PV of terminal value", value: pvTv, highlight: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-[7px] ${
                      row.highlight ? "border border-slate-100 bg-slate-50" : ""
                    }`}
                  >
                    <div>
                      <span className="text-[11px] text-slate-600">{row.label}</span>
                      <p className="text-[10px] text-slate-400">
                        {fmtPct((row.value / ev) * 100)} of EV
                      </p>
                    </div>
                    <span className="font-mono text-[13px] font-semibold text-slate-700 tabular-nums">
                      {fmtMoneyM(row.value)}
                    </span>
                  </div>
                ))}
                <div className="mt-0.5 flex items-center justify-between border-t-2 border-slate-200 px-3 py-[7px]">
                  <span className="text-[12px] font-bold text-slate-800">= EV (implied)</span>
                  <span className="font-mono text-[14px] font-bold text-slate-900 tabular-nums">
                    {fmtMoneyM(ev)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function ForecastSection({ rows, tv }: { rows: DcfYearRow[]; tv: number }) {
  const [open, setOpen] = useState(false);
  const lastIndex = rows.length - 1;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 text-left hover:bg-slate-50/50"
      >
        <div>
          <p className="text-[13px] font-bold text-slate-900">
            10-year path under market-implied growth
          </p>
          <p className="mt-px text-[11px] text-slate-400">
            Terminal value {fmtMoneyM(tv)} · open to verify the year-by-year path behind EV
          </p>
        </div>
        <Chevron open={open} className="text-slate-400" />
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Year", "Revenue $M", "Growth", "FCF margin", "FCF $M", "Terminal value"].map(
                  (heading) => (
                    <th key={heading} className="px-3.5 py-2">
                      <span className="text-[10px] font-bold tracking-wide whitespace-nowrap text-slate-400 uppercase">
                        {heading}
                      </span>
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const terminal = index === lastIndex;
                return (
                  <tr
                    key={row.year}
                    className={`border-b border-slate-50 ${terminal ? "bg-blue-50/40" : "hover:bg-slate-50/40"}`}
                  >
                    <td className="px-3.5 py-[7px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px] font-bold text-slate-800 tabular-nums">
                          {row.year}
                        </span>
                        {terminal && (
                          <span className="rounded-[4px] bg-blue-100 px-[5px] py-px text-[9px] font-bold text-blue-500">
                            Terminal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      <span className="font-mono text-[12px] text-slate-700 tabular-nums">
                        {Math.round(row.revenue).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[12px] text-slate-600 tabular-nums">
                          {fmtPct(row.growthPct)}
                        </span>
                        {index < 5 && (
                          <span className="text-[9px] font-semibold text-amber-500">(implied)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      <span className="font-mono text-[12px] text-slate-500 tabular-nums">
                        {fmtPct(row.fcfMargin)}
                      </span>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">
                        {Math.round(row.fcf).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      {terminal ? (
                        <span className="font-mono text-[12px] font-bold text-blue-600 tabular-nums">
                          {Math.round(tv).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
