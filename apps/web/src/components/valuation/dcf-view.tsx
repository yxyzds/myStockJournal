"use client";

import { useMemo, useState } from "react";
import {
  DRIVER_LIMITS,
  scenarioDrivers,
  valueDcf,
  type DcfBridge,
  type DcfDrivers,
  type DcfInputs,
  type DcfScenario,
  type DcfYearRow,
} from "@mystockjournal/shared";
import type { MethodViewProps } from "./actions";
import {
  AnchorRow,
  Card,
  CardHeader,
  ChallengeCard,
  Chevron,
  DriverField,
  fmt1,
  fmt2,
  fmtMoneyM,
  fmtPct,
  fmtSigned,
  type Challenge,
  type NumberLimits,
} from "./primitives";

const ANCHOR_LIMITS: Record<"ttmRevenue" | "cash" | "debt" | "shares", NumberLimits> = {
  ttmRevenue: { min: 0.01, max: 1e7, step: 1 },
  cash: { min: 0, max: 1e7, step: 1 },
  debt: { min: 0, max: 1e7, step: 1 },
  shares: { min: 0.0001, max: 1e6, step: 1 },
};

const SCENARIOS: DcfScenario[] = ["bear", "base", "bull"];

export type DcfViewProps = MethodViewProps & {
  assumptions: DcfInputs;
  onChange: (assumptions: DcfInputs) => void;
};

export function DcfView({
  anchors,
  currentPrice,
  priceAsOf,
  ticker,
  assumptions,
  onChange,
  myFairValue,
  actions,
}: DcfViewProps) {
  const [scenario, setScenario] = useState<DcfScenario | "custom">("base");

  const { rows, bridge } = useMemo(
    () => valueDcf(assumptions, currentPrice),
    [assumptions, currentPrice],
  );

  const challenges = useDcfChallenges(assumptions, anchors.past5YCagr);

  const scenarioFairValues = useMemo(() => {
    const entries = SCENARIOS.map((name) => {
      const drivers = scenarioDrivers(anchors.drivers, name);
      const { bridge: scenarioBridge } = valueDcf({ ...assumptions, ...drivers }, currentPrice);
      return [name, scenarioBridge.fv] as const;
    });
    return Object.fromEntries(entries) as Record<DcfScenario, number>;
  }, [anchors.drivers, assumptions, currentPrice]);

  function setField<K extends keyof DcfInputs>(key: K, value: DcfInputs[K]) {
    onChange({ ...assumptions, [key]: value });
    setScenario("custom");
  }

  function applyScenario(name: DcfScenario) {
    onChange({ ...assumptions, ...scenarioDrivers(anchors.drivers, name) });
    setScenario(name);
  }

  return (
    <div className="flex flex-col items-start gap-3 md:flex-row md:gap-4">
      <div className="flex w-full min-w-0 flex-col gap-3 md:flex-1">
        <ResultsSection
          bridge={bridge}
          currentPrice={currentPrice}
          priceAsOf={priceAsOf}
          ticker={ticker}
          myFairValue={myFairValue}
          actions={actions}
        />
        <AssumptionsSection
          assumptions={assumptions}
          anchorDrivers={anchors.drivers}
          anchorsAvailable={anchors.available}
          anchorPeriod={anchors.period}
          past5YCagr={anchors.past5YCagr}
          scenario={scenario}
          scenarioFairValues={scenarioFairValues}
          onScenario={applyScenario}
          onField={setField}
        />
        <BridgeSection bridge={bridge} assumptions={assumptions} currentPrice={currentPrice} />
        <ForecastSection rows={rows} bridge={bridge} />
      </div>

      <div className="w-full md:sticky md:top-[120px] md:w-[228px] md:shrink-0">
        <ChallengeCard challenges={challenges} />
      </div>
    </div>
  );
}

/** Threshold-based critiques of the drivers most likely to flatter a valuation. */
function useDcfChallenges(assumptions: DcfInputs, past5YCagr: number | null): Challenge[] {
  return useMemo(() => {
    const out: Challenge[] = [];

    if (assumptions.growthY1_5 > 30) {
      out.push({
        field: "Revenue Growth Y1–5",
        note: `${fmt1(assumptions.growthY1_5)}% sustained for five straight years`,
        bullets: [
          past5YCagr != null
            ? `Past five years compounded at ${fmt1(past5YCagr)}%, including deceleration`
            : "No historical CAGR on file to compare against",
          "Growth above 30% at scale is rare and rarely durable",
        ],
        question: "What durable advantage sustains this growth for the full five years?",
      });
    }

    if (assumptions.termGrowth > 4) {
      out.push({
        field: "Terminal Growth",
        note: `${fmt1(assumptions.termGrowth)}% forever, above long-run global GDP`,
        bullets: [
          "Implies the company outgrows the world economy in perpetuity",
          "Enterprise value is highly sensitive to g as it approaches WACC",
        ],
        question: "What structural moat sustains above-GDP growth forever?",
      });
    }

    if (assumptions.wacc < 7) {
      out.push({
        field: "WACC",
        note: `${fmt1(assumptions.wacc)}% is a low cost of capital for equities`,
        bullets: [
          "A lower discount rate raises fair value more than it may deserve",
          "Most listed equities are discounted at 8–11%",
        ],
        question: "What justifies a near risk-free cost of capital here?",
      });
    }

    if (assumptions.fcfMarginTerm > assumptions.fcfMarginY1 + 15) {
      out.push({
        field: "FCF Margin",
        note: `Expanding ${fmt1(assumptions.fcfMarginY1)}% → ${fmt1(assumptions.fcfMarginTerm)}%`,
        bullets: [
          "More than 15 points of margin expansion is a large operating bet",
          "Competition usually captures part of any scale benefit",
        ],
        question: "Which costs fall, and why can competitors not do the same?",
      });
    }

    if (assumptions.wacc <= assumptions.termGrowth) {
      out.push({
        field: "Terminal value undefined",
        note: "Terminal growth is at or above WACC",
        bullets: ["The Gordon growth formula diverges, so no terminal value exists"],
        question: "Which is wrong — the discount rate or the perpetual growth rate?",
      });
    }

    return out;
  }, [assumptions, past5YCagr]);
}

function ResultsSection({
  bridge,
  currentPrice,
  priceAsOf,
  ticker,
  myFairValue,
  actions,
}: {
  bridge: DcfBridge;
  currentPrice: number;
  priceAsOf: string | null;
  ticker: string;
  myFairValue: number | null;
  actions: MethodViewProps["actions"];
}) {
  const undervalued = bridge.mos >= 0;

  return (
    <Card>
      <div
        className={`flex items-center gap-2.5 border-b px-[22px] py-2.5 ${
          undervalued ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"
        }`}
      >
        <div
          className={`size-[7px] shrink-0 rounded-full ${undervalued ? "bg-emerald-500" : "bg-red-400"}`}
        />
        <p
          className={`text-[12px] leading-snug font-semibold ${
            undervalued ? "text-emerald-800" : "text-red-700"
          }`}
        >
          {undervalued
            ? `Price is ${fmt1(bridge.mos)}% below your fair value — $${fmt2(bridge.fv - currentPrice)} per share of margin`
            : `Price is ${fmt1(Math.abs(bridge.mos))}% above your fair value — no margin of safety at this price`}
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex flex-col gap-2.5 px-[18px] py-[18px] md:gap-3 md:px-6 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              My model fair value
            </span>
            {myFairValue !== null && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-[7px] py-0.5 text-[10px] font-bold text-emerald-700">
                My Fair Value · ${fmt2(myFairValue)}
              </span>
            )}
          </div>
          <div>
            <span
              className={`block font-mono text-[40px] leading-none font-bold tabular-nums md:text-[52px] ${
                undervalued ? "text-emerald-600" : "text-red-500"
              }`}
            >
              ${fmt2(bridge.fv)}
            </span>
            <span
              className={`mt-1 block text-[12px] font-semibold ${
                undervalued ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {fmtSigned(bridge.mos)} vs. current price
            </span>
          </div>
          <button
            type="button"
            onClick={actions.onSetFairValue}
            disabled={actions.saving || bridge.fv <= 0}
            className="self-start rounded-lg bg-emerald-600 px-3.5 py-[7px] text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Set as My Fair Value
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-[18px] py-[18px] md:gap-3 md:px-6 md:py-5">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Current market price
          </span>
          <div>
            <span className="block font-mono text-[40px] leading-none font-bold text-slate-700 tabular-nums md:text-[52px]">
              ${fmt2(currentPrice)}
            </span>
            <span className="mt-1 block text-[12px] text-slate-400">
              {ticker}
              {priceAsOf ? ` · ${priceAsOf}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={actions.onUseInDecision}
            disabled={actions.handingOff || bridge.fv <= 0}
            className={`self-start rounded-lg px-3.5 py-[7px] text-[11px] font-bold disabled:opacity-60 ${
              actions.handingOff ? "bg-blue-100 text-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {actions.handingOff ? "Returning…" : "Use in decision →"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-[18px] py-2.5 md:px-[22px]">
        <span className="shrink-0 text-[10px] font-semibold text-slate-400">Inside the model →</span>
        {[
          { label: "Terminal value", value: fmtMoneyM(bridge.tv) },
          { label: "PV of terminal value", value: fmtMoneyM(bridge.pvTv) },
          {
            label: "Terminal share of EV",
            value: bridge.ev > 0 ? fmtPct((bridge.pvTv / bridge.ev) * 100) : "—",
          },
          { label: "Sum of PV of FCFs", value: fmtMoneyM(bridge.pvFcfs) },
        ].map((chip) => (
          <div
            key={chip.label}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1"
          >
            <span className="text-[10px] whitespace-nowrap text-slate-400">{chip.label}</span>
            <span className="font-mono text-[11px] font-bold text-slate-700 tabular-nums">
              {chip.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AssumptionsSection({
  assumptions,
  anchorDrivers,
  anchorsAvailable,
  anchorPeriod,
  past5YCagr,
  scenario,
  scenarioFairValues,
  onScenario,
  onField,
}: {
  assumptions: DcfInputs;
  anchorDrivers: DcfDrivers;
  anchorsAvailable: boolean;
  anchorPeriod: string | null;
  past5YCagr: number | null;
  scenario: DcfScenario | "custom";
  scenarioFairValues: Record<DcfScenario, number>;
  onScenario: (scenario: DcfScenario) => void;
  onField: <K extends keyof DcfInputs>(key: K, value: DcfInputs[K]) => void;
}) {
  // Anchors start locked, but there is nothing to lock when no source had figures.
  const [unlocked, setUnlocked] = useState(!anchorsAvailable);

  return (
    <Card>
      <CardHeader
        title="Assumptions"
        subtitle="Edit the drivers — fair value updates as you type"
        right={
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-[3px]">
            {SCENARIOS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onScenario(name)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-center ${
                  scenario === name ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="block text-[10px] font-semibold capitalize">{name}</span>
                <span className="block font-mono text-[10px] font-bold">
                  ${fmt2(scenarioFairValues[name])}
                </span>
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col md:flex-row md:divide-x md:divide-slate-100">
        <div className="flex flex-1 flex-col gap-3.5 px-4 py-4 md:px-[22px] md:py-[18px]">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <div className="size-[7px] shrink-0 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold text-slate-800">Your drivers</span>
              <span className="hidden text-[10px] text-slate-400 md:inline">
                — these judgments drive FCF, terminal value, and EV
              </span>
            </div>
            <p className="hidden pl-[13px] text-[10px] leading-snug text-slate-400 md:block">
              Free cash flow comes from revenue × FCF margin. WACC discounts those flows and the
              terminal value into enterprise value.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
            <DriverField
              label="Revenue growth Y1–5"
              value={assumptions.growthY1_5}
              reference={anchorDrivers.growthY1_5}
              suffix="%"
              limits={DRIVER_LIMITS.growthY1_5}
              onChange={(v) => onField("growthY1_5", v)}
            />
            <DriverField
              label="Revenue growth Y6–10"
              value={assumptions.growthY6_10}
              reference={anchorDrivers.growthY6_10}
              suffix="%"
              limits={DRIVER_LIMITS.growthY6_10}
              onChange={(v) => onField("growthY6_10", v)}
            />
            <DriverField
              label="Terminal growth (g)"
              value={assumptions.termGrowth}
              reference={anchorDrivers.termGrowth}
              suffix="%"
              limits={DRIVER_LIMITS.termGrowth}
              onChange={(v) => onField("termGrowth", v)}
            />
            <DriverField
              label="WACC"
              value={assumptions.wacc}
              reference={anchorDrivers.wacc}
              suffix="%"
              limits={DRIVER_LIMITS.wacc}
              onChange={(v) => onField("wacc", v)}
            />
            <DriverField
              label="FCF margin Y1"
              value={assumptions.fcfMarginY1}
              reference={anchorDrivers.fcfMarginY1}
              suffix="%"
              limits={DRIVER_LIMITS.fcfMarginY1}
              onChange={(v) => onField("fcfMarginY1", v)}
            />
            <DriverField
              label="FCF margin terminal"
              value={assumptions.fcfMarginTerm}
              reference={anchorDrivers.fcfMarginTerm}
              suffix="%"
              limits={DRIVER_LIMITS.fcfMarginTerm}
              onChange={(v) => onField("fcfMarginTerm", v)}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 border-t border-slate-100 bg-slate-50 px-4 py-4 md:w-[240px] md:shrink-0 md:border-t-0 md:px-[18px] md:py-[18px]">
          <div>
            <span className="text-[11px] font-bold text-slate-500">Anchors</span>
            <p className="text-[10px] leading-snug text-slate-400">
              {anchorsAvailable
                ? `Prefetched${anchorPeriod ? ` · ${anchorPeriod}` : ""} · override only if needed`
                : "No source data for this ticker — enter the figures yourself"}
            </p>
          </div>

          <div className="flex flex-col">
            <AnchorRow
              label="TTM revenue"
              display={`$${assumptions.ttmRevenue.toLocaleString()}M`}
              unlocked={unlocked}
              value={assumptions.ttmRevenue}
              limits={ANCHOR_LIMITS.ttmRevenue}
              onChange={(v) => onField("ttmRevenue", v)}
            />
            <AnchorRow
              label="Cash & investments"
              display={`$${assumptions.cash.toLocaleString()}M`}
              unlocked={unlocked}
              value={assumptions.cash}
              limits={ANCHOR_LIMITS.cash}
              onChange={(v) => onField("cash", v)}
            />
            <AnchorRow
              label="Total debt"
              display={`$${assumptions.debt.toLocaleString()}M`}
              unlocked={unlocked}
              value={assumptions.debt}
              limits={ANCHOR_LIMITS.debt}
              onChange={(v) => onField("debt", v)}
            />
            <AnchorRow
              label="Diluted shares"
              display={`${assumptions.shares.toLocaleString()}M`}
              unlocked={unlocked}
              value={assumptions.shares}
              limits={ANCHOR_LIMITS.shares}
              onChange={(v) => onField("shares", v)}
            />
            {past5YCagr != null && (
              <AnchorRow
                label="Past 5Y revenue CAGR"
                display={fmtPct(past5YCagr)}
                note="Reference only · not used in the model"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setUnlocked((value) => !value)}
              className="rounded-md border border-dashed border-slate-300 px-2.5 py-1.5 text-center text-[10px] font-semibold text-slate-400 hover:border-blue-400 hover:text-blue-600"
            >
              {unlocked ? "Lock anchors" : "Unlock to override"}
            </button>
            <p className="text-center text-[10px] leading-snug text-slate-400">
              Cash and debt convert enterprise value into equity value per share.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BridgeSection({
  bridge,
  assumptions,
  currentPrice,
}: {
  bridge: DcfBridge;
  assumptions: DcfInputs;
  currentPrice: number;
}) {
  const [evOpen, setEvOpen] = useState(false);
  const undervalued = bridge.mos >= 0;

  return (
    <Card>
      <div className="border-b border-slate-100 px-[22px] py-3.5">
        <div className="flex items-baseline gap-2.5">
          <p className="text-[14px] font-bold text-slate-900">Valuation bridge</p>
          <span className="text-[11px] text-slate-400">
            Terminal value {fmtMoneyM(bridge.tv)} · PV {fmtMoneyM(bridge.pvTv)}
          </span>
        </div>
        <p className="mt-px text-[11px] text-slate-400">
          FCF → terminal value → EV → plus cash, less debt → equity → fair value per share
        </p>
      </div>

      <div className="px-[22px] py-3.5">
        <div className="flex max-w-[520px] flex-col">
          <button
            type="button"
            onClick={() => setEvOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
          >
            <div className="flex items-center gap-2">
              <Chevron open={evOpen} className="text-slate-400" />
              <span className="text-[12px] font-bold text-slate-800">Enterprise value</span>
              <span className="hidden text-[10px] text-slate-400 sm:inline">
                {evOpen ? "— click to collapse" : "· click for the FCF and terminal split"}
              </span>
            </div>
            <span className="font-mono text-[14px] font-bold text-slate-900 tabular-nums">
              {fmtMoneyM(bridge.ev)}
            </span>
          </button>

          {evOpen && (
            <div className="mt-0.5 ml-[22px] flex flex-col border-l-2 border-slate-100 pl-3.5">
              {[
                { label: "Sum of PV of FCFs (10 years)", value: fmtMoneyM(bridge.pvFcfs) },
                {
                  label: "PV of terminal value, FCF₁₀ × (1+g) / (WACC−g)",
                  value: fmtMoneyM(bridge.pvTv),
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-[11px] text-slate-500">{row.label}</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-600 tabular-nums">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-1 ml-[22px] flex flex-col">
            {[
              { op: "+", label: "Cash & investments", value: assumptions.cash, tone: "text-emerald-600" },
              { op: "−", label: "Total debt", value: assumptions.debt, tone: "text-red-500" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-3.5 shrink-0 font-mono text-[13px] font-bold ${row.tone}`}>
                    {row.op}
                  </span>
                  <span className="text-[12px] text-slate-500">{row.label}</span>
                </div>
                <span className="font-mono text-[12px] font-semibold text-slate-600 tabular-nums">
                  {fmtMoneyM(row.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-0.5 border-t-2 border-slate-200" />

          <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="text-[12px] font-bold text-slate-800">Equity value</span>
            <span className="font-mono text-[14px] font-bold text-slate-900 tabular-nums">
              {fmtMoneyM(bridge.equity)}
            </span>
          </div>

          <div className="ml-[22px] flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 font-mono text-[13px] font-bold text-slate-300">÷</span>
              <span className="text-[12px] text-slate-500">Diluted shares outstanding</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-slate-600 tabular-nums">
              {fmt1(assumptions.shares)}M
            </span>
          </div>

          <div className="mt-0.5 border-t-2 border-slate-900" />

          <div
            className={`mt-1.5 flex items-center justify-between gap-3 rounded-[9px] border px-3.5 py-2.5 ${
              undervalued ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            }`}
          >
            <div>
              <span
                className={`text-[12px] font-bold ${undervalued ? "text-emerald-700" : "text-red-600"}`}
              >
                = Fair value per share
              </span>
              <span className="ml-2 text-[10px] text-slate-400">equity value ÷ shares</span>
            </div>
            <span
              className={`font-mono text-[22px] font-bold tabular-nums ${
                undervalued ? "text-emerald-700" : "text-red-500"
              }`}
            >
              ${fmt2(bridge.fv)}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between rounded-[7px] bg-slate-50 px-3.5 py-[7px]">
              <span className="text-[12px] text-slate-500">Current market price</span>
              <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">
                ${fmt2(currentPrice)}
              </span>
            </div>
            <div
              className={`flex items-center justify-between rounded-[7px] px-3.5 py-2 ${
                undervalued ? "bg-emerald-50" : "bg-red-50"
              }`}
            >
              <span
                className={`text-[12px] font-bold ${undervalued ? "text-emerald-700" : "text-red-600"}`}
              >
                Margin of safety
              </span>
              <span
                className={`font-mono text-[16px] font-bold tabular-nums ${
                  undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {fmtSigned(bridge.mos)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ForecastSection({ rows, bridge }: { rows: DcfYearRow[]; bridge: DcfBridge }) {
  const [open, setOpen] = useState(false);
  const lastIndex = rows.length - 1;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-[22px] py-3.5 text-left hover:bg-slate-50"
      >
        <div className="flex flex-col gap-[3px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[14px] font-bold text-slate-900">10-year FCF forecast</p>
            <span className="text-[11px] font-semibold text-blue-600">
              Terminal value {fmtMoneyM(bridge.tv)}
            </span>
            <span className="text-[11px] text-slate-500">PV {fmtMoneyM(bridge.pvTv)}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {open
              ? "Revenue → FCF by year · terminal value lands in the final year · all figures $M"
              : "Open to verify the year-by-year path behind enterprise value · all figures $M"}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2 text-blue-500">
          <span className="hidden text-[11px] font-semibold sm:inline">
            {open ? "Hide table" : "Show forecast"}
          </span>
          <Chevron open={open} />
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-slate-900">
                <th className="w-[130px] px-5 py-2 text-left">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Driver
                  </span>
                </th>
                {rows.map((row, index) => (
                  <th
                    key={row.year}
                    className={`px-2.5 py-2 text-right ${index === lastIndex ? "bg-blue-900" : ""}`}
                  >
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        index === lastIndex ? "text-blue-200" : "text-slate-300"
                      }`}
                    >
                      {row.year}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <ForecastRow
                label="Revenue"
                rows={rows}
                lastIndex={lastIndex}
                render={(row) => Math.round(row.revenue).toLocaleString()}
              />
              <ForecastRow
                label="YoY growth"
                rows={rows}
                lastIndex={lastIndex}
                render={(row) => fmtPct(row.growthPct)}
                muted
              />
              <tr className="border-y border-slate-200 bg-slate-50">
                <td className="px-5 py-2">
                  <span className="text-[11px] font-bold text-slate-800">Free cash flow</span>
                </td>
                {rows.map((row, index) => (
                  <td
                    key={row.year}
                    className={`px-2.5 py-2 text-right ${index === lastIndex ? "bg-blue-100/60" : ""}`}
                  >
                    <span
                      className={`font-mono text-[11px] font-bold tabular-nums ${
                        index === lastIndex ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      {Math.round(row.fcf).toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
              <ForecastRow
                label="FCF margin"
                rows={rows}
                lastIndex={lastIndex}
                render={(row) => fmtPct(row.fcfMargin)}
                muted
              />
              <tr>
                <td className="px-5 py-[7px]">
                  <span className="text-[11px] font-semibold text-blue-600">Terminal value</span>
                  <p className="text-[9px] text-slate-400">FCF × (1+g) / (WACC−g)</p>
                </td>
                {rows.map((row, index) => (
                  <td
                    key={row.year}
                    className={`px-2.5 py-[7px] text-right ${index === lastIndex ? "bg-blue-50/40" : ""}`}
                  >
                    {index === lastIndex ? (
                      <span className="font-mono text-[11px] font-bold text-blue-600 tabular-nums">
                        {Math.round(bridge.tv).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-200">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-t-2 border-blue-200 bg-blue-50/40">
                <td className="px-5 py-2">
                  <span className="text-[11px] font-bold text-slate-800">Total</span>
                  <p className="text-[9px] text-slate-400">FCF + terminal value</p>
                </td>
                {rows.map((row, index) => (
                  <td
                    key={row.year}
                    className={`px-2.5 py-2 text-right ${index === lastIndex ? "bg-blue-100" : ""}`}
                  >
                    <span
                      className={`font-mono text-[11px] font-bold tabular-nums ${
                        index === lastIndex ? "text-blue-800" : "text-slate-500"
                      }`}
                    >
                      {Math.round(index === lastIndex ? row.fcf + bridge.tv : row.fcf).toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ForecastRow({
  label,
  rows,
  lastIndex,
  render,
  muted = false,
}: {
  label: string;
  rows: DcfYearRow[];
  lastIndex: number;
  render: (row: DcfYearRow) => string;
  muted?: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-5 py-[7px]">
        <span className="text-[11px] text-slate-500">{label}</span>
      </td>
      {rows.map((row, index) => (
        <td
          key={row.year}
          className={`px-2.5 py-[7px] text-right ${index === lastIndex ? "bg-blue-50/40" : ""}`}
        >
          <span
            className={`font-mono text-[11px] tabular-nums ${muted ? "text-slate-400" : "text-slate-500"}`}
          >
            {render(row)}
          </span>
        </td>
      ))}
    </tr>
  );
}
