"use client";

import { useMemo, useState } from "react";
import {
  DRIVER_LIMITS,
  dcfModelReady,
  valueRdcf,
  type DcfInputs,
  type DcfYearRow,
  type FilingRef,
  type RdcfInputs,
  type WaccBuild,
} from "@mystockjournal/shared";
import { useI18n, type MessageKey } from "@/i18n";
import type { MethodViewProps } from "./actions";
import {
  AnchorRow,
  Card,
  CardHeader,
  Chevron,
  FieldHint,
  FilingSourceNote,
  NumberInput,
  fmt2,
  fmtMoneyM,
  fmtPct,
} from "./primitives";
import { WaccDriverButton } from "./wacc-calculator";

const HELD_DRIVERS = [
  { key: "termGrowth", label: "rdcf.termGrowth", hint: "rdcf.termGrowthHint" },
  { key: "fcfMarginY1", label: "rdcf.fcfMarginY1", hint: "rdcf.fcfMarginY1Hint" },
  { key: "fcfMarginTerm", label: "rdcf.fcfMarginTerm", hint: "rdcf.fcfMarginTermHint" },
  { key: "growthY6_10", label: "rdcf.growthY610", hint: "rdcf.growthY610Hint" },
] as const satisfies readonly { key: keyof RdcfInputs; label: MessageKey; hint: MessageKey }[];

export type RdcfViewProps = MethodViewProps & {
  assumptions: RdcfInputs;
  onChange: (assumptions: RdcfInputs) => void;
  /** The user's own DCF drivers, so the market's growth can be compared to theirs. */
  dcfBaseline: DcfInputs;
  onOpenDcf: () => void;
  termGrowthFloor: number;
  onApplyWacc: (wacc: number, build: WaccBuild) => void;
};

export function RdcfView({
  ticker,
  anchors,
  currentPrice,
  assumptions,
  onChange,
  dcfBaseline,
  onOpenDcf,
  termGrowthFloor,
  onApplyWacc,
}: RdcfViewProps) {
  const { t } = useI18n();
  const result = useMemo(() => valueRdcf(assumptions, currentPrice), [assumptions, currentPrice]);
  const ready = dcfModelReady(assumptions);
  const implied = ready ? result.impliedGrowthY1_5 : null;

  function setField<K extends keyof RdcfInputs>(key: K, value: RdcfInputs[K]) {
    if (key === "fcfMarginY1" && anchors.fcfMarginY1FromFilings) return;
    onChange({ ...assumptions, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <HeroSection
        implied={implied}
        assumptions={assumptions}
        currentPrice={currentPrice}
        targetEv={ready ? result.targetEv : 0}
        baselineGrowth={dcfBaseline.growthY1_5}
        ready={ready}
      />

      <ComparisonSection
        implied={implied}
        assumptions={assumptions}
        dcfBaseline={dcfBaseline}
        onOpenDcf={onOpenDcf}
      />

      <HeldConstantsSection
        ticker={ticker}
        assumptions={assumptions}
        anchorsAvailable={anchors.available}
        fcfMarginY1FromFilings={anchors.fcfMarginY1FromFilings}
        anchorPeriod={anchors.period}
        sourceFilings={anchors.sourceFilings}
        past5YCagr={anchors.past5YCagr}
        currentPrice={currentPrice}
        termGrowthFloor={termGrowthFloor}
        onField={setField}
        onApplyWacc={onApplyWacc}
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

      <div className="flex flex-wrap justify-end gap-2 pb-2">
        <button
          type="button"
          onClick={onOpenDcf}
          className="rounded-[9px] bg-slate-100 px-3.5 py-2 text-[12px] font-bold text-slate-700 hover:bg-slate-200"
        >
          {t("rdcf.openInDcf")}
        </button>
      </div>
    </div>
  );
}

function HeroSection({
  implied,
  assumptions,
  currentPrice,
  targetEv,
  baselineGrowth,
  ready,
}: {
  implied: number | null;
  assumptions: RdcfInputs;
  currentPrice: number;
  targetEv: number;
  baselineGrowth: number;
  ready: boolean;
}) {
  const { t } = useI18n();
  const faster = implied != null && implied > baselineGrowth;

  return (
    <Card className="rounded-[16px]">
      <div className="bg-slate-900 px-6 py-2.5">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          {t("rdcf.marketPricing")}
        </span>
      </div>

      <div className="px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start gap-6 md:gap-8">
          <div>
            <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              {t("rdcf.currentPrice")}
            </p>
            <span className="font-mono text-[32px] font-bold text-slate-800 tabular-nums">
              ${fmt2(currentPrice)}
            </span>
          </div>

          <div className="mt-[18px] hidden text-[28px] text-slate-200 select-none md:block">→</div>

          <div>
            <p className="mb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              {t("rdcf.impliedCagr")}
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
                {t("rdcf.y610Held")}
              </p>
              <span className="font-mono text-[18px] font-bold text-slate-700 tabular-nums">
                {fmtPct(assumptions.growthY6_10)}
              </span>
            </div>
            <div className="rounded-[10px] border border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="mb-[3px] text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                {t("rdcf.targetEv")}
              </p>
              <span className="font-mono text-[18px] font-bold text-slate-700 tabular-nums">
                {ready ? fmtMoneyM(targetEv) : "—"}
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
              {t("rdcf.noSolve", { price: fmt2(currentPrice) })}
            </p>
          ) : (
            <p
              className={`text-[13px] leading-relaxed ${faster ? "text-amber-800" : "text-blue-800"}`}
            >
              {t("rdcf.imply", {
                price: fmt2(currentPrice),
                implied: fmtPct(implied),
                y1: fmtPct(assumptions.fcfMarginY1),
                term: fmtPct(assumptions.fcfMarginTerm),
                wacc: fmtPct(assumptions.wacc),
                g: fmtPct(assumptions.termGrowth),
              })}
              {faster ? t("rdcf.faster") : t("rdcf.slower")}
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
  const { t } = useI18n();
  const faster = implied != null && implied > dcfBaseline.growthY1_5;

  const rows = [
    {
      label: t("rdcf.cagrY15"),
      market: implied == null ? "—" : fmtPct(implied),
      yours: fmtPct(dcfBaseline.growthY1_5),
      solved: true,
    },
    {
      label: t("rdcf.growthY610Row"),
      market: `${fmtPct(assumptions.growthY6_10)} ${t("rdcf.rule")}`,
      yours: fmtPct(dcfBaseline.growthY6_10),
    },
    {
      label: t("rdcf.fcfMarginY1"),
      market: `${fmtPct(assumptions.fcfMarginY1)} ${t("rdcf.held")}`,
      yours: fmtPct(dcfBaseline.fcfMarginY1),
    },
    {
      label: t("rdcf.fcfMarginTerm"),
      market: `${fmtPct(assumptions.fcfMarginTerm)} ${t("rdcf.held")}`,
      yours: fmtPct(dcfBaseline.fcfMarginTerm),
    },
    {
      label: t("rdcf.wacc"),
      market: `${fmtPct(assumptions.wacc)} ${t("rdcf.held")}`,
      yours: fmtPct(dcfBaseline.wacc),
    },
    {
      label: t("rdcf.termGrowth"),
      market: `${fmtPct(assumptions.termGrowth)} ${t("rdcf.held")}`,
      yours: fmtPct(dcfBaseline.termGrowth),
    },
  ];

  return (
    <Card>
      <CardHeader
        title={t("rdcf.compareTitle")}
        subtitle={t("rdcf.compareSub")}
        right={
          implied == null ? null : (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${faster ? "bg-amber-50" : "bg-blue-50"}`}
            >
              <div className={`size-1.5 rounded-full ${faster ? "bg-amber-400" : "bg-blue-400"}`} />
              <span
                className={`text-[11px] font-semibold ${faster ? "text-amber-700" : "text-blue-700"}`}
              >
                {faster ? t("rdcf.marketFaster") : t("rdcf.marketSlower")}
              </span>
            </div>
          )
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {["", t("rdcf.colMarket"), t("rdcf.colMine")].map((heading, index) => (
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
          {t("rdcf.editInDcf")}
        </button>
      </div>
    </Card>
  );
}

function HeldDriverRow({
  label,
  hint,
  value,
  limits,
  onChange,
  readOnly = false,
}: {
  label: string;
  hint: string;
  value: number;
  limits: (typeof DRIVER_LIMITS)[keyof typeof DRIVER_LIMITS];
  onChange: (value: number) => void;
  readOnly?: boolean;
}) {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-1 items-center gap-1 text-[11px] text-slate-600">
          {label}
          <FieldHint text={hint} open={hintOpen} onToggle={() => setHintOpen((open) => !open)} />
        </span>
        <div
          className={`flex items-center gap-1 rounded-[7px] border px-2 py-1 ${
            readOnly
              ? "border-slate-100 bg-slate-50"
              : "border-slate-200 bg-white focus-within:border-blue-300"
          }`}
        >
          <NumberInput
            value={value}
            limits={limits}
            onCommit={onChange}
            ariaLabel={label}
            readOnly={readOnly}
            className="w-12 text-right text-[12px] font-bold text-slate-900"
          />
          <span className="text-[10px] text-slate-400">%</span>
        </div>
      </div>
      {hintOpen ? (
        <p className="rounded-md border border-blue-50 bg-blue-50/60 px-2 py-1.5 text-[10px] leading-snug text-slate-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function HeldConstantsSection({
  ticker,
  assumptions,
  anchorsAvailable,
  fcfMarginY1FromFilings,
  anchorPeriod,
  sourceFilings,
  past5YCagr,
  currentPrice,
  termGrowthFloor,
  onField,
  onApplyWacc,
}: {
  ticker: string;
  assumptions: RdcfInputs;
  anchorsAvailable: boolean;
  fcfMarginY1FromFilings: boolean;
  anchorPeriod: string | null;
  sourceFilings: FilingRef[];
  past5YCagr: number | null;
  currentPrice: number;
  termGrowthFloor: number;
  onField: <K extends keyof RdcfInputs>(key: K, value: RdcfInputs[K]) => void;
  onApplyWacc: (wacc: number, build: WaccBuild) => void;
}) {
  const { t } = useI18n();
  // Filed figures are facts, so they are only typed in when no filing covered the ticker.
  const manualEntry = !anchorsAvailable;

  return (
    <Card>
      <CardHeader
        title={t("rdcf.heldTitle")}
        subtitle={t("rdcf.heldSub")}
      />

      <div className="flex flex-col gap-4 p-5 md:flex-row">
        <div className="flex-1 rounded-[10px] border border-slate-100 bg-slate-50 p-3.5">
          <div className="mb-2.5">
            <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              {t("dcf.anchors")}
            </span>
            <div className="mt-px">
              {manualEntry ? (
                <p className="text-[10px] text-slate-400">
                  {t("rdcf.noFiling")}
                </p>
              ) : (
                <FilingSourceNote period={anchorPeriod} filings={sourceFilings} />
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <AnchorRow
              label={t("dcf.ttmRevenue")}
              display={`$${assumptions.ttmRevenue.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.ttmRevenue}
              limits={{ min: 0.01, max: 1e7, step: 1 }}
              onChange={(v) => onField("ttmRevenue", v)}
            />
            <AnchorRow
              label={t("dcf.cash")}
              display={`$${assumptions.cash.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.cash}
              limits={{ min: 0, max: 1e7, step: 1 }}
              onChange={(v) => onField("cash", v)}
            />
            <AnchorRow
              label={t("dcf.debt")}
              display={`$${assumptions.debt.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.debt}
              limits={{ min: 0, max: 1e7, step: 1 }}
              onChange={(v) => onField("debt", v)}
            />
            <AnchorRow
              label={t("dcf.shares")}
              display={`${assumptions.shares.toLocaleString("en-US")}M`}
              editable={manualEntry}
              value={assumptions.shares}
              limits={{ min: 0.0001, max: 1e6, step: 1 }}
              onChange={(v) => onField("shares", v)}
            />
            <AnchorRow
              label={t("rdcf.currentMarketPrice")}
              display={`$${fmt2(currentPrice)}`}
              note={t("rdcf.lockedPrice")}
            />
            {past5YCagr != null && (
              <AnchorRow
                label={t("rdcf.past5y")}
                display={fmtPct(past5YCagr)}
                note={t("valuation.referenceOnly")}
              />
            )}
          </div>

          <p className="mt-2.5 border-t border-slate-200 pt-2 text-[10px] leading-snug text-slate-400 italic">
            {t("rdcf.cashDebtHelp")}
          </p>
        </div>

        <div className="flex-1 rounded-[10px] border border-blue-100 bg-white p-3.5">
          <div className="mb-2.5">
            <span className="text-[11px] font-bold tracking-wide text-blue-700 uppercase">
              {t("rdcf.heldDrivers")}
            </span>
            <p className="mt-px text-[10px] text-blue-400">
              {t("rdcf.heldDriversSub")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <WaccDriverButton
              compact
              label={t("rdcf.wacc")}
              hint={t("rdcf.waccHint")}
              value={assumptions.wacc}
              ticker={ticker}
              termGrowth={termGrowthFloor}
              savedBuild={assumptions.waccBuild}
              sourceFilings={sourceFilings}
              onApply={onApplyWacc}
            />
            {HELD_DRIVERS.map((driver) => (
              <HeldDriverRow
                key={driver.key}
                label={t(driver.label)}
                hint={t(driver.hint)}
                value={assumptions[driver.key]}
                limits={DRIVER_LIMITS[driver.key]}
                onChange={(value) => onField(driver.key, value)}
                readOnly={driver.key === "fcfMarginY1" && fcfMarginY1FromFilings}
              />
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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const chain = [
    {
      label: t("rdcf.currentPrice"),
      value: `$${fmt2(currentPrice)}`,
      note: t("rdcf.timesShares", { shares: assumptions.shares.toLocaleString("en-US") }),
    },
    { label: t("rdcf.eqMarketCap"), value: fmtMoneyM(marketCap) },
    { label: t("rdcf.minusCash"), value: `(${fmtMoneyM(assumptions.cash)})`, negative: true },
    { label: t("rdcf.plusDebt"), value: fmtMoneyM(assumptions.debt) },
    { label: t("rdcf.eqTargetEv"), value: fmtMoneyM(targetEv), strong: true },
  ];

  return (
    <Card>
      <CardHeader title={t("rdcf.priceBridge")} subtitle={t("rdcf.priceBridgeSub")} />

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
              {open ? t("rdcf.hideEv") : t("rdcf.showEv")}
            </button>

            {open && (
              <div className="mt-2 flex flex-col gap-1 pl-3">
                {[
                  { label: t("rdcf.pvFcfsY110"), value: pvFcfs },
                  { label: t("dcf.pvTerminal"), value: pvTv, highlight: true },
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
                        {t("rdcf.ofEv", { pct: fmtPct((row.value / ev) * 100) })}
                      </p>
                    </div>
                    <span className="font-mono text-[13px] font-semibold text-slate-700 tabular-nums">
                      {fmtMoneyM(row.value)}
                    </span>
                  </div>
                ))}
                <div className="mt-0.5 flex items-center justify-between border-t-2 border-slate-200 px-3 py-[7px]">
                  <span className="text-[12px] font-bold text-slate-800">{t("rdcf.eqEvImplied")}</span>
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
  const { t } = useI18n();
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
            {t("rdcf.forecastTitle")}
          </p>
          <p className="mt-px text-[11px] text-slate-400">
            {t("rdcf.forecastSub", { tv: fmtMoneyM(tv) })}
          </p>
        </div>
        <Chevron open={open} className="text-slate-400" />
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[
                  t("rdcf.colYear"),
                  t("rdcf.colRevenue"),
                  t("rdcf.colGrowth"),
                  t("dcf.fcfMargin"),
                  t("rdcf.colFcf"),
                  t("dcf.terminalValue"),
                ].map((heading) => (
                  <th key={heading} className="px-3.5 py-2">
                    <span className="text-[10px] font-bold tracking-wide whitespace-nowrap text-slate-400 uppercase">
                      {heading}
                    </span>
                  </th>
                ))}
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
                            {t("rdcf.terminal")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      <span className="font-mono text-[12px] text-slate-700 tabular-nums">
                        {Math.round(row.revenue).toLocaleString("en-US")}
                      </span>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[12px] text-slate-600 tabular-nums">
                          {fmtPct(row.growthPct)}
                        </span>
                        {index < 5 && (
                          <span className="text-[9px] font-semibold text-amber-500">{t("rdcf.implied")}</span>
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
                        {Math.round(row.fcf).toLocaleString("en-US")}
                      </span>
                    </td>
                    <td className="px-3.5 py-[7px]">
                      {terminal ? (
                        <span className="font-mono text-[12px] font-bold text-blue-600 tabular-nums">
                          {Math.round(tv).toLocaleString("en-US")}
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
