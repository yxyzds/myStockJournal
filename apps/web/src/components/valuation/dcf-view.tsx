"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  DCF_REVIEW_FIELDS,
  DRIVER_LIMITS,
  MOS_PERCENT_LIMITS,
  dcfModelReady,
  scenarioDrivers,
  valueDcf,
  type DcfAssumptionReview,
  type DcfBridge,
  type DcfDrivers,
  type DcfInputs,
  type DcfReviewField,
  type DcfScenario,
  type DcfYearRow,
  type FilingRef,
  type QuarterlyActual,
  type WaccBuild,
} from "@mystockjournal/shared";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import type { MethodViewProps } from "./actions";
import { ActualsStrip } from "./actuals-strip";
import { WaccDriverButton } from "./wacc-calculator";
import {
  AnchorRow,
  Card,
  CardHeader,
  Chevron,
  DriverField,
  FilingSourceNote,
  NumberInput,
  fmt1,
  fmt2,
  fmtMoneyM,
  fmtPct,
  fmtSigned,
  type NumberLimits,
} from "./primitives";

const ANCHOR_LIMITS: Record<"ttmRevenue" | "cash" | "debt" | "shares", NumberLimits> = {
  ttmRevenue: { min: 0.01, max: 1e7, step: 1 },
  cash: { min: 0, max: 1e7, step: 1 },
  debt: { min: 0, max: 1e7, step: 1 },
  shares: { min: 0.0001, max: 1e6, step: 1 },
};

const SCENARIOS: DcfScenario[] = ["bear", "base", "bull"];

const REVIEW_FIELD_KEYS: Record<DcfReviewField, MessageKey> = {
  growthY1_5: "dcf.growthY15",
  growthY6_10: "dcf.growthY610",
  termGrowth: "dcf.termGrowth",
  wacc: "dcf.wacc",
  fcfMarginTerm: "dcf.fcfMarginTerm",
};

const SCENARIO_KEYS: Record<DcfScenario, MessageKey> = {
  bear: "dcf.bear",
  base: "dcf.base",
  bull: "dcf.bull",
};

export type DcfViewProps = MethodViewProps & {
  assumptions: DcfInputs;
  onChange: (assumptions: DcfInputs) => void;
  review: DcfAssumptionReview | null;
  onReview: (review: DcfAssumptionReview) => void;
  termGrowthFloor: number;
  onApplyWacc: (wacc: number, build: WaccBuild) => void;
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
  review,
  onReview,
  termGrowthFloor,
  onApplyWacc,
}: DcfViewProps) {
  const [scenario, setScenario] = useState<DcfScenario | "custom">("base");

  const { rows, bridge } = useMemo(
    () => valueDcf(assumptions, currentPrice),
    [assumptions, currentPrice],
  );
  const ready = dcfModelReady(assumptions);
  const scenariosEnabled = anchors.drivers.wacc >= DRIVER_LIMITS.wacc.min;

  const scenarioFairValues = useMemo(() => {
    if (!scenariosEnabled) {
      return { bear: 0, base: 0, bull: 0 } as Record<DcfScenario, number>;
    }
    const entries = SCENARIOS.map((name) => {
      const drivers = scenarioDrivers(anchors.drivers, name);
      // Filing-derived Y1 margin stays fixed across bear/base/bull.
      if (anchors.fcfMarginY1FromFilings) {
        drivers.fcfMarginY1 = anchors.drivers.fcfMarginY1;
      }
      const { bridge: scenarioBridge } = valueDcf({ ...assumptions, ...drivers }, currentPrice);
      return [name, scenarioBridge.fv] as const;
    });
    return Object.fromEntries(entries) as Record<DcfScenario, number>;
  }, [anchors.drivers, anchors.fcfMarginY1FromFilings, assumptions, currentPrice, scenariosEnabled]);

  function setField<K extends keyof DcfInputs>(key: K, value: DcfInputs[K]) {
    if (key === "fcfMarginY1" && anchors.fcfMarginY1FromFilings) return;
    onChange({ ...assumptions, [key]: value });
    // MOS is a judgment haircut, not a driver scenario change.
    if (key !== "mosPercent") setScenario("custom");
  }

  function applyScenario(name: DcfScenario) {
    if (anchors.drivers.wacc < DRIVER_LIMITS.wacc.min) return;
    const drivers = scenarioDrivers(anchors.drivers, name);
    if (anchors.fcfMarginY1FromFilings) {
      drivers.fcfMarginY1 = anchors.drivers.fcfMarginY1;
    }
    onChange({ ...assumptions, ...drivers });
    setScenario(name);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <ResultsSection
        bridge={bridge}
        assumptions={assumptions}
        ready={ready}
        currentPrice={currentPrice}
        priceAsOf={priceAsOf}
        ticker={ticker}
        myFairValue={myFairValue}
        actions={actions}
        onField={setField}
      />
      <AssumptionsSection
        assumptions={assumptions}
        anchorDrivers={anchors.drivers}
        anchorsAvailable={anchors.available}
        fcfMarginY1FromFilings={anchors.fcfMarginY1FromFilings}
        anchorPeriod={anchors.period}
        sourceFilings={anchors.sourceFilings}
        past5YCagr={anchors.past5YCagr}
        quarterlyActuals={anchors.quarterlyActuals ?? []}
        scenario={scenario}
        scenarioFairValues={scenarioFairValues}
        scenariosEnabled={scenariosEnabled}
        onScenario={applyScenario}
        onField={setField}
        ticker={ticker}
        review={review}
        onReview={onReview}
        termGrowthFloor={termGrowthFloor}
        onApplyWacc={(wacc, build) => {
          setScenario("custom");
          onApplyWacc(wacc, build);
        }}
      />
      <BridgeSection
        bridge={bridge}
        assumptions={assumptions}
        ready={ready}
        currentPrice={currentPrice}
        onField={setField}
      />
      {ready ? <ForecastSection rows={rows} bridge={bridge} /> : null}
    </div>
  );
}

function ResultsSection({
  bridge,
  assumptions,
  ready,
  currentPrice,
  priceAsOf,
  ticker,
  myFairValue,
  actions,
  onField,
}: {
  bridge: DcfBridge;
  assumptions: DcfInputs;
  ready: boolean;
  currentPrice: number;
  priceAsOf: string | null;
  ticker: string;
  myFairValue: number | null;
  actions: MethodViewProps["actions"];
  onField: <K extends keyof DcfInputs>(key: K, value: DcfInputs[K]) => void;
}) {
  const { t } = useI18n();
  const priceGap =
    currentPrice > 0 ? ((bridge.fv - currentPrice) / currentPrice) * 100 : 0;
  const undervalued = ready && bridge.fv >= currentPrice;

  return (
    <Card>
      {ready ? (
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
              ? t("dcf.cushionBelow", { pct: fmt1(priceGap), amount: fmt2(bridge.fv - currentPrice) })
              : t("dcf.noCushion", { pct: fmt1(Math.abs(priceGap)) })}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex flex-col gap-2.5 px-[18px] py-[18px] md:gap-3 md:px-6 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t("dcf.mos")}
            </span>
            {myFairValue !== null && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-[7px] py-0.5 text-[10px] font-bold text-emerald-700">
                {t("dcf.myFairValue", { value: fmt2(myFairValue) })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-[10px] border-2 border-slate-200 bg-white px-3.5 py-2 focus-within:border-blue-400">
            <NumberInput
              value={assumptions.mosPercent}
              limits={MOS_PERCENT_LIMITS}
              onCommit={(value) => onField("mosPercent", value)}
              ariaLabel={t("dcf.mos")}
              className="min-w-0 flex-1 text-[28px] font-bold text-slate-900 md:text-[32px]"
            />
            <span className="text-[18px] font-semibold text-slate-400">%</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {t("dcf.haircut", { intrinsic: ready ? `$${fmt2(bridge.intrinsic)}` : "—" })}
          </p>

          <div className="mt-1 border-t border-slate-100 pt-2.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t("dcf.modelFairValue")}
            </span>
            <span
              className={`mt-1 block font-mono text-[40px] leading-none font-bold tabular-nums md:text-[52px] ${
                !ready ? "text-slate-300" : undervalued ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {ready ? `$${fmt2(bridge.fv)}` : "—"}
            </span>
            {ready ? (
              <span
                className={`mt-1 block text-[12px] font-semibold ${
                  undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {t("dcf.vsCurrent", { gap: fmtSigned(priceGap) })}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={actions.onSetFairValue}
            disabled={actions.saving || !ready || bridge.fv <= 0}
            className="self-start rounded-lg bg-emerald-600 px-3.5 py-[7px] text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("dcf.setAsMyFairValue")}
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-[18px] py-[18px] md:gap-3 md:px-6 md:py-5">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            {t("dcf.currentPrice")}
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
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-[18px] py-2.5 md:px-[22px]">
        <span className="shrink-0 text-[10px] font-semibold text-slate-400">{t("dcf.insideModel")}</span>
        {[
          { label: t("dcf.intrinsicShare"), value: ready ? `$${fmt2(bridge.intrinsic)}` : "—" },
          { label: t("dcf.terminalValue"), value: ready ? fmtMoneyM(bridge.tv) : "—" },
          { label: t("dcf.pvTerminal"), value: ready ? fmtMoneyM(bridge.pvTv) : "—" },
          {
            label: t("dcf.terminalShareEv"),
            value: ready && bridge.ev > 0 ? fmtPct((bridge.pvTv / bridge.ev) * 100) : "—",
          },
          { label: t("dcf.sumPvFcfs"), value: ready ? fmtMoneyM(bridge.pvFcfs) : "—" },
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
  fcfMarginY1FromFilings,
  anchorPeriod,
  sourceFilings,
  past5YCagr,
  quarterlyActuals,
  scenario,
  scenarioFairValues,
  scenariosEnabled,
  onScenario,
  onField,
  ticker,
  review,
  onReview,
  termGrowthFloor,
  onApplyWacc,
}: {
  assumptions: DcfInputs;
  anchorDrivers: DcfDrivers;
  anchorsAvailable: boolean;
  fcfMarginY1FromFilings: boolean;
  anchorPeriod: string | null;
  sourceFilings: FilingRef[];
  past5YCagr: number | null;
  quarterlyActuals: QuarterlyActual[];
  scenario: DcfScenario | "custom";
  scenarioFairValues: Record<DcfScenario, number>;
  scenariosEnabled: boolean;
  onScenario: (scenario: DcfScenario) => void;
  onField: <K extends keyof DcfInputs>(key: K, value: DcfInputs[K]) => void;
  ticker: string;
  review: DcfAssumptionReview | null;
  onReview: (review: DcfAssumptionReview) => void;
  termGrowthFloor: number;
  onApplyWacc: (wacc: number, build: WaccBuild) => void;
}) {
  const { t } = useI18n();
  // Filed figures are facts, so they are only typed in when no filing covered the ticker.
  const manualEntry = !anchorsAvailable;

  return (
    <Card>
      <CardHeader
        title={t("dcf.assumptions")}
        subtitle={t("dcf.assumptionsSub")}
        right={
          scenariosEnabled ? (
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
                  <span className="block text-[10px] font-semibold capitalize">{t(SCENARIO_KEYS[name])}</span>
                  <span className="block font-mono text-[10px] font-bold">
                    ${fmt2(scenarioFairValues[name])}
                  </span>
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-col md:flex-row md:divide-x md:divide-slate-100">
        <div className="flex flex-1 flex-col gap-3.5 px-4 py-4 md:px-[22px] md:py-[18px]">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <div className="size-[7px] shrink-0 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold text-slate-800">{t("dcf.yourDrivers")}</span>
              <span className="hidden text-[10px] text-slate-400 md:inline">
                {t("dcf.driversAside")}
              </span>
            </div>
            <p className="hidden pl-[13px] text-[10px] leading-snug text-slate-400 md:block">
              {t("dcf.driversHelp")}
            </p>
          </div>

          {quarterlyActuals.length > 0 ? (
            <ActualsStrip key={quarterlyActuals.at(-1)?.end} actuals={quarterlyActuals} />
          ) : null}

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
            <DriverField
              label={t("dcf.growthY15")}
              hint={t("dcf.growthY15Hint")}
              value={assumptions.growthY1_5}
              suffix="%"
              limits={DRIVER_LIMITS.growthY1_5}
              onChange={(v) => onField("growthY1_5", v)}
            />
            <DriverField
              label={t("dcf.growthY610")}
              hint={t("dcf.growthY610Hint")}
              value={assumptions.growthY6_10}
              suffix="%"
              limits={DRIVER_LIMITS.growthY6_10}
              onChange={(v) => onField("growthY6_10", v)}
            />
            <DriverField
              label={t("dcf.termGrowth")}
              hint={t("dcf.termGrowthHint")}
              value={assumptions.termGrowth}
              suffix="%"
              limits={DRIVER_LIMITS.termGrowth}
              onChange={(v) => onField("termGrowth", v)}
            />
            <WaccDriverButton
              label={t("dcf.wacc")}
              hint={t("dcf.waccHint")}
              value={assumptions.wacc}
              ticker={ticker}
              termGrowth={termGrowthFloor}
              savedBuild={assumptions.waccBuild}
              onApply={(wacc, build) => {
                onApplyWacc(wacc, build);
              }}
            />
            <DriverField
              label={t("dcf.fcfMarginY1")}
              hint={t("dcf.fcfMarginY1Hint")}
              value={assumptions.fcfMarginY1}
              suffix="%"
              limits={DRIVER_LIMITS.fcfMarginY1}
              onChange={(v) => onField("fcfMarginY1", v)}
              readOnly={fcfMarginY1FromFilings}
            />
            <DriverField
              label={t("dcf.fcfMarginTerm")}
              hint={t("dcf.fcfMarginTermHint")}
              value={assumptions.fcfMarginTerm}
              suffix="%"
              limits={DRIVER_LIMITS.fcfMarginTerm}
              onChange={(v) => onField("fcfMarginTerm", v)}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 border-t border-slate-100 bg-slate-50 px-4 py-4 md:w-[240px] md:shrink-0 md:border-t-0 md:px-[18px] md:py-[18px]">
          <div>
            <span className="text-[11px] font-bold text-slate-500">{t("dcf.anchors")}</span>
            {manualEntry ? (
              <p className="text-[10px] leading-snug text-slate-400">
                {t("dcf.noFiling")}
              </p>
            ) : (
              <FilingSourceNote period={anchorPeriod} filings={sourceFilings} />
            )}
          </div>

          <div className="flex flex-col">
            <AnchorRow
              label={t("dcf.ttmRevenue")}
              display={`$${assumptions.ttmRevenue.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.ttmRevenue}
              limits={ANCHOR_LIMITS.ttmRevenue}
              onChange={(v) => onField("ttmRevenue", v)}
            />
            <AnchorRow
              label={t("dcf.cash")}
              display={`$${assumptions.cash.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.cash}
              limits={ANCHOR_LIMITS.cash}
              onChange={(v) => onField("cash", v)}
            />
            <AnchorRow
              label={t("dcf.debt")}
              display={`$${assumptions.debt.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.debt}
              limits={ANCHOR_LIMITS.debt}
              onChange={(v) => onField("debt", v)}
            />
            <AnchorRow
              label={t("dcf.shares")}
              display={`${assumptions.shares.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.shares}
              limits={ANCHOR_LIMITS.shares}
              onChange={(v) => onField("shares", v)}
            />
            {past5YCagr != null && (
              <AnchorRow
                label={t("dcf.past5yCagr")}
                display={fmtPct(past5YCagr)}
                note={t("valuation.referenceOnly")}
              />
            )}
          </div>

          <p className="pt-1 text-[10px] leading-snug text-slate-400">
            {t("dcf.cashDebtHelp")}
          </p>
        </div>
      </div>

      <DcfAssumptionReviewBar
        ticker={ticker}
        assumptions={assumptions}
        review={review}
        onReview={onReview}
      />
    </Card>
  );
}

function RobotIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />
      <rect x="4" y="5" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="15" cy="10.5" r="1.5" fill="currentColor" />
      <path d="M9 13.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 16v2M16 16v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 18h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DcfAssumptionReviewBar({
  ticker,
  assumptions,
  review,
  onReview,
}: {
  ticker: string;
  assumptions: DcfInputs;
  review: DcfAssumptionReview | null;
  onReview: (review: DcfAssumptionReview) => void;
}) {
  const { t } = useI18n();
  const ready = dcfModelReady(assumptions);
  const rateMutation = useMutation({
    mutationFn: () =>
      api<{ review: DcfAssumptionReview }>(`/stocks/${ticker}/valuation/dcf/ai-review`, {
        method: "POST",
        body: JSON.stringify({ assumptions }),
      }),
    onSuccess: (data) => onReview(data.review),
  });

  const errorMessage =
    rateMutation.error instanceof ApiError
      ? rateMutation.error.message
      : rateMutation.error instanceof Error
        ? rateMutation.error.message
        : null;

  const analyzing = rateMutation.isPending;

  if (!review) {
    return (
      <div className="flex w-full items-center justify-between gap-3 border-t border-[#ebf0f5] px-4 py-[18px] md:px-[22px]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-[#1e293b]">{t("dcf.rateTitle")}</span>
          <span className="text-[11px] text-[#94a3b8]">{t("dcf.rateHint")}</span>
          {errorMessage && <p className="text-[11px] font-medium text-red-500">{errorMessage}</p>}
        </div>
        <button
          type="button"
          disabled={analyzing || !ready}
          onClick={() => rateMutation.mutate()}
          className="flex shrink-0 items-center gap-2 rounded-[10px] px-4 py-[9px] text-white disabled:opacity-60"
          style={{
            background: analyzing ? "#3b5fc0" : "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
            boxShadow: "0 2px 10px rgba(37,99,235,0.28), 0 1px 3px rgba(15,23,42,0.1)",
          }}
        >
          <RobotIcon size={17} />
          <span className="text-[12px] font-semibold whitespace-nowrap">
            {analyzing ? t("common.analyzing") : t("common.analyze")}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full border-t border-[#ebf0f5] px-4 py-[18px] md:px-[22px]">
      <div className="flex items-start gap-3.5">
        <div
          className="flex h-[54px] min-w-[54px] shrink-0 items-center justify-center rounded-xl px-2"
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            boxShadow: "0 0 0 1.5px #93c5fd",
          }}
        >
          <span className="text-center text-[11px] leading-tight font-bold text-[#1e40af]">
            {t(`grades.${review.grade}`)}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[#94a3b8]">
            <RobotIcon size={12} />
            <span className="text-[9px] font-bold tracking-widest uppercase">{t("dcf.aiVerdict")}</span>
          </div>
          <div className="flex flex-col gap-2">
            {DCF_REVIEW_FIELDS.map((key) => (
              <div key={key}>
                <p className="text-[10px] font-bold text-slate-400">{t(REVIEW_FIELD_KEYS[key])}</p>
                <p className="text-[12px] leading-[1.5] font-medium text-[#334155]">
                  {review.comments[key]}
                </p>
              </div>
            ))}
          </div>
          {errorMessage && <p className="text-[11px] font-medium text-red-500">{errorMessage}</p>}
        </div>
        <button
          type="button"
          title={t("common.reanalyze")}
          disabled={analyzing || !ready}
          onClick={() => rateMutation.mutate()}
          className="flex shrink-0 items-center gap-1.5 rounded-[7px] border border-[#e2e8f0] px-2.5 py-1.5 text-[#94a3b8] hover:border-[#93c5fd] hover:bg-[#eff6ff] hover:text-[#2563eb] disabled:opacity-50"
        >
          <RobotIcon size={12} />
          <span className="text-[11px] font-medium">{analyzing ? t("common.analyzing") : t("common.rerun")}</span>
        </button>
      </div>
    </div>
  );
}

function BridgeSection({
  bridge,
  assumptions,
  ready,
  currentPrice,
  onField,
}: {
  bridge: DcfBridge;
  assumptions: DcfInputs;
  ready: boolean;
  currentPrice: number;
  onField: <K extends keyof DcfInputs>(key: K, value: DcfInputs[K]) => void;
}) {
  const { t } = useI18n();
  const [evOpen, setEvOpen] = useState(false);
  const priceGap =
    currentPrice > 0 ? ((bridge.fv - currentPrice) / currentPrice) * 100 : 0;
  const undervalued = ready && bridge.fv >= currentPrice;

  return (
    <Card>
      <div className="border-b border-slate-100 px-[22px] py-3.5">
        <div className="flex items-baseline gap-2.5">
          <p className="text-[14px] font-bold text-slate-900">{t("dcf.bridge")}</p>
          <span className="text-[11px] text-slate-400">
            {t("dcf.bridgeTv", {
              tv: ready ? fmtMoneyM(bridge.tv) : "—",
              pv: ready ? fmtMoneyM(bridge.pvTv) : "—",
            })}
          </span>
        </div>
        <p className="mt-px text-[11px] text-slate-400">
          {t("dcf.bridgeFlow")}
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
              <span className="text-[12px] font-bold text-slate-800">{t("dcf.enterpriseValue")}</span>
              <span className="hidden text-[10px] text-slate-400 sm:inline">
                {evOpen ? t("dcf.clickCollapse") : t("dcf.clickSplit")}
              </span>
            </div>
            <span className="font-mono text-[14px] font-bold text-slate-900 tabular-nums">
              {ready ? fmtMoneyM(bridge.ev) : "—"}
            </span>
          </button>

          {evOpen && (
            <div className="mt-0.5 ml-[22px] flex flex-col border-l-2 border-slate-100 pl-3.5">
              {[
                { label: t("dcf.sumPvFcfsYears"), value: ready ? fmtMoneyM(bridge.pvFcfs) : "—" },
                {
                  label: t("dcf.pvTvFormula"),
                  value: ready ? fmtMoneyM(bridge.pvTv) : "—",
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
              { op: "+", label: t("dcf.cash"), value: assumptions.cash, tone: "text-emerald-600" },
              { op: "−", label: t("dcf.debt"), value: assumptions.debt, tone: "text-red-500" },
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
            <span className="text-[12px] font-bold text-slate-800">{t("dcf.equityValue")}</span>
            <span className="font-mono text-[14px] font-bold text-slate-900 tabular-nums">
              {ready ? fmtMoneyM(bridge.equity) : "—"}
            </span>
          </div>

          <div className="ml-[22px] flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 font-mono text-[13px] font-bold text-slate-300">÷</span>
              <span className="text-[12px] text-slate-500">{t("dcf.dilutedShares")}</span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-slate-600 tabular-nums">
              {fmt1(assumptions.shares)}M
            </span>
          </div>

          <div className="mt-0.5 border-t-2 border-slate-200" />

          <div className="mt-1.5 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5">
            <div>
              <span className="text-[12px] font-bold text-slate-800">{t("dcf.intrinsicEq")}</span>
              <span className="ml-2 text-[10px] text-slate-400">{t("dcf.equityDivShares")}</span>
            </div>
            <span className="font-mono text-[18px] font-bold text-slate-900 tabular-nums">
              {ready ? `$${fmt2(bridge.intrinsic)}` : "—"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-[7px] border border-slate-200 bg-white px-3.5 py-2">
            <div>
              <span className="text-[12px] font-bold text-slate-700">{t("dcf.minusMos")}</span>
              <span className="ml-2 text-[10px] text-slate-400">{t("dcf.yourHaircut")}</span>
            </div>
            <div className="flex items-center gap-1">
              <NumberInput
                value={assumptions.mosPercent}
                limits={MOS_PERCENT_LIMITS}
                onCommit={(value) => onField("mosPercent", value)}
                ariaLabel={t("dcf.mos")}
                className="w-16 text-right text-[16px] font-bold text-slate-900"
              />
              <span className="text-[13px] font-semibold text-slate-400">%</span>
            </div>
          </div>

          <div className="mt-0.5 border-t-2 border-slate-900" />

          <div
            className={`mt-1.5 flex items-center justify-between gap-3 rounded-[9px] border px-3.5 py-2.5 ${
              !ready
                ? "border-slate-200 bg-slate-50"
                : undervalued
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
            }`}
          >
            <div>
              <span
                className={`text-[12px] font-bold ${
                  !ready ? "text-slate-700" : undervalued ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {t("dcf.fairValueShare")}
              </span>
              <span className="ml-2 text-[10px] text-slate-400">
                {t("dcf.mosFormula", { pct: fmt1(assumptions.mosPercent) })}
              </span>
            </div>
            <span
              className={`font-mono text-[22px] font-bold tabular-nums ${
                !ready ? "text-slate-300" : undervalued ? "text-emerald-700" : "text-red-500"
              }`}
            >
              {ready ? `$${fmt2(bridge.fv)}` : "—"}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between rounded-[7px] bg-slate-50 px-3.5 py-[7px]">
              <span className="text-[12px] text-slate-500">{t("dcf.currentPrice")}</span>
              <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">
                ${fmt2(currentPrice)}
              </span>
            </div>
            <div
              className={`flex items-center justify-between rounded-[7px] px-3.5 py-2 ${
                !ready ? "bg-slate-50" : undervalued ? "bg-emerald-50" : "bg-red-50"
              }`}
            >
              <span
                className={`text-[12px] font-bold ${
                  !ready ? "text-slate-500" : undervalued ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {t("dcf.vsCurrentLabel")}
              </span>
              <span
                className={`font-mono text-[16px] font-bold tabular-nums ${
                  !ready ? "text-slate-300" : undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {ready ? fmtSigned(priceGap) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ForecastSection({ rows, bridge }: { rows: DcfYearRow[]; bridge: DcfBridge }) {
  const { t } = useI18n();
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
            <p className="text-[14px] font-bold text-slate-900">{t("dcf.forecastTitle")}</p>
            <span className="text-[11px] font-semibold text-blue-600">
              {t("dcf.terminalValue")} {fmtMoneyM(bridge.tv)}
            </span>
            <span className="text-[11px] text-slate-500">{t("dcf.pvShort", { value: fmtMoneyM(bridge.pvTv) })}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {open ? t("dcf.forecastOpen") : t("dcf.forecastClosed")}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2 text-blue-500">
          <span className="hidden text-[11px] font-semibold sm:inline">
            {open ? t("dcf.hideTable") : t("dcf.showForecast")}
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
                    {t("dcf.driver")}
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
                label={t("dcf.revenue")}
                rows={rows}
                lastIndex={lastIndex}
                render={(row) => Math.round(row.revenue).toLocaleString("en-US")}
              />
              <ForecastRow
                label={t("dcf.yoyGrowth")}
                rows={rows}
                lastIndex={lastIndex}
                render={(row) => fmtPct(row.growthPct)}
                muted
              />
              <tr className="border-y border-slate-200 bg-slate-50">
                <td className="px-5 py-2">
                  <span className="text-[11px] font-bold text-slate-800">{t("dcf.freeCashFlow")}</span>
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
                      {Math.round(row.fcf).toLocaleString("en-US")}
                    </span>
                  </td>
                ))}
              </tr>
              <ForecastRow
                label={t("dcf.fcfMargin")}
                rows={rows}
                lastIndex={lastIndex}
                render={(row) => fmtPct(row.fcfMargin)}
                muted
              />
              <tr>
                <td className="px-5 py-[7px]">
                  <span className="text-[11px] font-semibold text-blue-600">{t("dcf.terminalValue")}</span>
                  <p className="text-[9px] text-slate-400">{t("dcf.tvFormula")}</p>
                </td>
                {rows.map((row, index) => (
                  <td
                    key={row.year}
                    className={`px-2.5 py-[7px] text-right ${index === lastIndex ? "bg-blue-50/40" : ""}`}
                  >
                    {index === lastIndex ? (
                      <span className="font-mono text-[11px] font-bold text-blue-600 tabular-nums">
                        {Math.round(bridge.tv).toLocaleString("en-US")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-200">—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="border-t-2 border-blue-200 bg-blue-50/40">
                <td className="px-5 py-2">
                  <span className="text-[11px] font-bold text-slate-800">{t("dcf.total")}</span>
                  <p className="text-[9px] text-slate-400">{t("dcf.fcfPlusTv")}</p>
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
                      {Math.round(index === lastIndex ? row.fcf + bridge.tv : row.fcf).toLocaleString("en-US")}
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
