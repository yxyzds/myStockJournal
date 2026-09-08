"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DRIVER_LIMITS,
  WACC_BUILD_LIMITS,
  computeWacc,
  type WaccBuild,
  type WaccFieldSource,
  type WaccInputsResponse,
  type WaccPrefillResponse,
} from "@mystockjournal/shared";
import { useI18n } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { FieldHint, NumberInput, fmtMoneyM, fmtPct } from "./primitives";

function yahooQuoteUrl(symbol: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

function secCompanyUrl(ticker: string) {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}&type=10-&owner=exclude&count=40`;
}

function locked(source: WaccFieldSource) {
  return source === "filing" || source === "yahoo";
}

function pct(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function WaccDriverButton({
  label,
  hint,
  value,
  ticker,
  termGrowth,
  savedBuild,
  onApply,
  compact = false,
}: {
  label: string;
  hint: string;
  value: number;
  ticker: string;
  termGrowth: number;
  savedBuild?: WaccBuild;
  onApply: (wacc: number, build: WaccBuild) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const unset = value < DRIVER_LIMITS.wacc.min;

  return (
    <>
      <div className="flex flex-col gap-1">
        {compact ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex flex-1 items-center gap-1 text-[11px] text-slate-600">
              {label}
              <FieldHint text={hint} open={hintOpen} onToggle={() => setHintOpen((v) => !v)} />
            </span>
            <button
              type="button"
              aria-label={t("waccCalc.openAria")}
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 rounded-[7px] border border-blue-200 bg-blue-50 px-2 py-1 text-left hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="w-12 text-right font-mono text-[12px] font-bold text-blue-900 tabular-nums">
                {unset ? "—" : value.toFixed(1)}
              </span>
              <span className="text-[10px] text-blue-500">%</span>
              <ChevronRight />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold tracking-[0.07em] text-slate-500 uppercase">{label}</span>
              <FieldHint text={hint} open={hintOpen} onToggle={() => setHintOpen((v) => !v)} />
            </div>
            <button
              type="button"
              aria-label={t("waccCalc.openAria")}
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 rounded-[7px] border border-blue-200 bg-blue-50 px-2.5 py-[7px] text-left transition-colors hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="w-full font-mono text-[14px] font-bold text-blue-900 tabular-nums">
                {unset ? "—" : value.toFixed(1)}
              </span>
              <span className="shrink-0 text-[11px] text-blue-500">%</span>
              <ChevronRight />
            </button>
          </>
        )}
        {hintOpen ? (
          <p
            className={`rounded-md px-2 py-1.5 text-[10px] leading-snug text-slate-600 ${
              compact
                ? "border border-blue-50 bg-blue-50/60"
                : "border border-slate-100 bg-slate-50 font-normal tracking-normal normal-case"
            }`}
          >
            {hint}
          </p>
        ) : null}
      </div>
      {open ? (
        <WaccCalculatorModal
          ticker={ticker}
          termGrowth={termGrowth}
          savedBuild={savedBuild}
          onClose={() => setOpen(false)}
          onApply={(wacc, build) => {
            onApply(wacc, build);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function WaccCalculatorModal({
  ticker,
  termGrowth,
  savedBuild,
  onClose,
  onApply,
}: {
  ticker: string;
  termGrowth: number;
  savedBuild?: WaccBuild;
  onClose: () => void;
  onApply: (wacc: number, build: WaccBuild) => void;
}) {
  const { t } = useI18n();
  const [facts, setFacts] = useState<WaccInputsResponse | null>(null);
  const [build, setBuild] = useState<WaccBuild | null>(null);
  const [sources, setSources] = useState<WaccInputsResponse["sources"] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loadingFacts, setLoadingFacts] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingFacts(true);
      setError(null);
      try {
        const data = await api<WaccInputsResponse>(`/stocks/${ticker}/valuation/wacc-inputs`);
        if (cancelled) return;
        setFacts(data);
        const next: WaccBuild = {
          equity: data.equity,
          debt: data.debt,
          rf: data.rf ?? savedBuild?.rf ?? null,
          beta: data.beta ?? savedBuild?.beta ?? null,
          erp: savedBuild?.erp ?? null,
          preTaxCostOfDebt: data.preTaxCostOfDebt ?? savedBuild?.preTaxCostOfDebt ?? null,
          taxRate: data.taxRate ?? savedBuild?.taxRate ?? null,
        };
        const nextSources = { ...data.sources };
        if (data.rf == null && next.rf != null) nextSources.rf = savedBuild ? "user" : "ai";
        if (data.beta == null && next.beta != null) nextSources.beta = savedBuild ? "user" : "ai";
        if (next.erp != null) nextSources.erp = "user";
        if (data.preTaxCostOfDebt == null && next.preTaxCostOfDebt != null) {
          nextSources.preTaxCostOfDebt = savedBuild ? "user" : "ai";
        }
        if (data.taxRate == null && next.taxRate != null) nextSources.taxRate = savedBuild ? "user" : "ai";
        setBuild(next);
        setSources(nextSources);
        if (!cancelled) setLoadingFacts(false);

        const skipAi = savedBuild?.erp != null;
        if (skipAi) return;

        setLoadingAi(true);
        try {
          const payload = await api<{ prefill: WaccPrefillResponse }>(
            `/stocks/${ticker}/valuation/wacc/ai-prefill`,
            {
              method: "POST",
              body: JSON.stringify({
                rf: data.rf,
                beta: data.beta,
                preTaxCostOfDebt: data.preTaxCostOfDebt,
                taxRate: data.taxRate,
                equity: data.equity,
                debt: data.debt,
              }),
            },
          );
          if (cancelled) return;
          const prefill = payload.prefill;
          setNote(prefill.note);
          setBuild((current) => {
            if (!current) return current;
            return {
              ...current,
              erp: prefill.erp,
              rf: current.rf ?? prefill.rf ?? null,
              beta: current.beta ?? prefill.beta ?? null,
              preTaxCostOfDebt: current.preTaxCostOfDebt ?? prefill.preTaxCostOfDebt ?? null,
              taxRate: current.taxRate ?? prefill.taxRate ?? null,
            };
          });
          setSources((current) => {
            if (!current) return current;
            return {
              ...current,
              erp: "ai",
              rf: current.rf === "missing" && prefill.rf != null ? "ai" : current.rf,
              beta: current.beta === "missing" && prefill.beta != null ? "ai" : current.beta,
              preTaxCostOfDebt:
                current.preTaxCostOfDebt === "missing" && prefill.preTaxCostOfDebt != null
                  ? "ai"
                  : current.preTaxCostOfDebt,
              taxRate: current.taxRate === "missing" && prefill.taxRate != null ? "ai" : current.taxRate,
            };
          });
        } catch (aiError) {
          if (!cancelled) {
            if (aiError instanceof ApiError && aiError.status === 429) {
              setError(t("waccCalc.quota"));
            } else {
              setError(aiError instanceof Error ? aiError.message : t("waccCalc.loadError"));
            }
          }
        } finally {
          if (!cancelled) setLoadingAi(false);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t("waccCalc.loadError"));
      } finally {
        if (!cancelled) setLoadingFacts(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [savedBuild, t, ticker]);

  const computed = useMemo(() => (build ? computeWacc(build) : null), [build]);
  const waccTooLow =
    computed?.wacc != null && Number.isFinite(termGrowth) && computed.wacc <= termGrowth;
  const canApply =
    computed?.wacc != null &&
    !waccTooLow &&
    computed.wacc >= DRIVER_LIMITS.wacc.min &&
    computed.wacc <= DRIVER_LIMITS.wacc.max;

  function patch(partial: Partial<WaccBuild>, sourceKey?: keyof WaccInputsResponse["sources"]) {
    setBuild((current) => (current ? { ...current, ...partial } : current));
    if (sourceKey) {
      setSources((current) => (current ? { ...current, [sourceKey]: "user" } : current));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="wacc-calc-title"
        aria-busy={loadingFacts || loadingAi}
        className="max-h-[92vh] w-full max-w-[420px] overflow-y-auto rounded-[18px] border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 rounded-t-[18px] bg-sky-50 px-4 py-3">
          <div>
            <h2 id="wacc-calc-title" className="text-[16px] font-bold text-slate-900">
              {t("waccCalc.title")}
            </h2>
            <p className="mt-0.5 font-mono text-[10px] text-sky-700">{t("waccCalc.formula")}</p>
          </div>
          <button
            type="button"
            aria-label={t("waccCalc.closeAria")}
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {error ? <p className="text-[12px] font-medium text-red-500">{error}</p> : null}

          {loadingFacts ? (
            <ModalLoading message={t("waccCalc.loadingFacts")} />
          ) : build && sources ? (
            <>
              <Section title={t("waccCalc.equityCost")} color="bg-blue-500">
                <CalcRow
                  label={t("waccCalc.rf")}
                  hint={t("waccCalc.rfHint")}
                  explain={t("waccCalc.rfExplain")}
                  suffix="%"
                  value={build.rf}
                  limits={WACC_BUILD_LIMITS.rf}
                  readOnly={locked(sources.rf)}
                  loading={loadingAi && build.rf == null}
                  source={{ label: t("waccCalc.sourceTnx"), url: yahooQuoteUrl("^TNX") }}
                  onChange={(v) => patch({ rf: v || null }, "rf")}
                />
                <CalcRow
                  label={t("waccCalc.beta")}
                  hint={t("waccCalc.betaHint")}
                  explain={t("waccCalc.betaExplain")}
                  value={build.beta}
                  limits={WACC_BUILD_LIMITS.beta}
                  readOnly={locked(sources.beta)}
                  loading={loadingAi && build.beta == null}
                  source={{
                    label: t("waccCalc.sourceYahoo"),
                    url: `${yahooQuoteUrl(ticker)}/key-statistics`,
                  }}
                  onChange={(v) => patch({ beta: v || null }, "beta")}
                />
                <CalcRow
                  label={t("waccCalc.erp")}
                  hint={t("waccCalc.erpHint")}
                  explain={t("waccCalc.erpExplain")}
                  suffix="%"
                  value={build.erp}
                  limits={WACC_BUILD_LIMITS.erp}
                  readOnly={false}
                  loading={loadingAi && build.erp == null}
                  onChange={(v) => patch({ erp: v || null }, "erp")}
                />
                {note ? <p className="text-[10px] leading-snug text-slate-500">{note}</p> : null}
                {loadingAi ? <p className="text-[11px] text-blue-500">{t("waccCalc.loadingAi")}</p> : null}
                <ResultBar label={t("waccCalc.costOfEquity")} value={pct(computed?.costOfEquity)} accent />
              </Section>

              <Section title={t("waccCalc.debtCost")} color="bg-violet-500">
                <CalcRow
                  label={t("waccCalc.rd")}
                  hint={t("waccCalc.rdHint")}
                  explain={t("waccCalc.rdExplain")}
                  suffix="%"
                  value={build.preTaxCostOfDebt}
                  limits={WACC_BUILD_LIMITS.preTaxCostOfDebt}
                  readOnly={locked(sources.preTaxCostOfDebt)}
                  loading={loadingAi && build.preTaxCostOfDebt == null}
                  source={{ label: t("waccCalc.sourceEdgar"), url: secCompanyUrl(ticker) }}
                  onChange={(v) => patch({ preTaxCostOfDebt: v || null }, "preTaxCostOfDebt")}
                />
                <CalcRow
                  label={t("waccCalc.tax")}
                  hint={t("waccCalc.taxHint")}
                  explain={t("waccCalc.taxExplain")}
                  suffix="%"
                  value={build.taxRate}
                  limits={WACC_BUILD_LIMITS.taxRate}
                  readOnly={locked(sources.taxRate)}
                  loading={loadingAi && build.taxRate == null}
                  source={{ label: t("waccCalc.sourceEdgar"), url: secCompanyUrl(ticker) }}
                  onChange={(v) => patch({ taxRate: v }, "taxRate")}
                />
                <ResultBar label={t("waccCalc.afterTaxDebt")} value={pct(computed?.afterTaxCostOfDebt)} />
              </Section>

              <Section title={t("waccCalc.structure")} color="bg-emerald-500">
                <ReadRow label={t("waccCalc.equity")} hint={t("waccCalc.equityHint")} value={fmtMoneyM(build.equity)} />
                <ReadRow label={t("waccCalc.debt")} hint={t("waccCalc.debtHint")} value={fmtMoneyM(build.debt)} />
                <ReadRow label={t("waccCalc.total")} value={fmtMoneyM(computed?.totalValue ?? 0)} />
                <ReadRow
                  label={t("waccCalc.equityWeight")}
                  value={computed?.equityWeight == null ? "—" : fmtPct(computed.equityWeight * 100)}
                />
                <ReadRow
                  label={t("waccCalc.debtWeight")}
                  value={computed?.debtWeight == null ? "—" : fmtPct(computed.debtWeight * 100)}
                />
              </Section>

              <div className="flex items-center justify-between rounded-[10px] bg-slate-900 px-3.5 py-3 text-white">
                <span className="text-[11px] font-bold tracking-wide uppercase">{t("waccCalc.result")}</span>
                <span className="font-mono text-[22px] font-bold tabular-nums">{pct(computed?.wacc, 1)}</span>
              </div>
              {waccTooLow ? (
                <p className="text-[11px] font-medium text-red-500">
                  {t("waccCalc.waccTooLow", { g: termGrowth.toFixed(1) })}
                </p>
              ) : computed?.wacc == null ? (
                <p className="text-[11px] text-slate-500">{t("waccCalc.needInputs")}</p>
              ) : null}

              <button
                type="button"
                disabled={!canApply || !facts || loadingAi}
                onClick={() => {
                  if (!canApply || computed?.wacc == null || !build) return;
                  const wacc = Math.min(
                    DRIVER_LIMITS.wacc.max,
                    Math.max(DRIVER_LIMITS.wacc.min, computed.wacc),
                  );
                  onApply(wacc, build);
                }}
                className="w-full rounded-[10px] bg-blue-600 py-2.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {t("waccCalc.apply")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${color}`} />
        <h3 className="text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CalcRow({
  label,
  hint,
  explain,
  suffix,
  value,
  limits,
  readOnly,
  loading,
  source,
  onChange,
}: {
  label: string;
  hint: string;
  explain: string;
  suffix?: string;
  value: number | null;
  limits: { min: number; max: number; step: number };
  readOnly: boolean;
  loading?: boolean;
  source?: { label: string; url: string };
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const displayLimits = limits.min > 0 ? limits : { ...limits, min: Math.max(limits.step, 0.01) };
  return (
    <div className="block">
      <div className="mb-1 flex items-end justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.06em] text-slate-400 uppercase">{label}</span>
        <span className="text-[9px] text-slate-400">{readOnly ? t("waccCalc.fetched") : hint}</span>
      </div>
      <div
        className={`flex items-center gap-1 rounded-[8px] border px-2.5 py-2 ${
          loading ? "border-slate-100 bg-slate-50" : readOnly ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white"
        }`}
      >
        {loading ? (
          <div className="h-5 w-full animate-pulse rounded bg-slate-200/80" />
        ) : (
          <>
            <NumberInput
              value={value ?? 0}
              limits={displayLimits}
              onCommit={onChange}
              ariaLabel={label}
              readOnly={readOnly}
              className="w-full text-[14px] font-bold text-slate-900"
            />
            {suffix ? <span className="text-[12px] text-slate-400">{suffix}</span> : null}
          </>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-snug text-slate-400">
        {explain}
        {source ? (
          <>
            {" "}
            {t("waccCalc.fetchedFrom")}{" "}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-blue-600 hover:decoration-blue-300"
            >
              {source.label}
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden className="shrink-0">
                <path
                  d="M3.5 1.5h5v5M8.5 1.5L4 6M6.5 8.5h-5v-5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}

function ReadRow({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <div>
        <p className="text-[11px] text-slate-500">{label}</p>
        {hint ? <p className="text-[9px] text-slate-400">{hint}</p> : null}
      </div>
      <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">{value}</span>
    </div>
  );
}

function ResultBar({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`mt-1 flex items-center justify-between rounded-[8px] px-3 py-2 ${
        accent ? "bg-blue-50 text-blue-800" : "bg-slate-50 text-slate-700"
      }`}
    >
      <span className="font-mono text-[10px]">{label}</span>
      <span className="font-mono text-[14px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

function ModalLoading({ message }: { message: string }) {
  return (
    <div className="space-y-3 py-2" aria-live="polite">
      <p className="text-center text-[12px] text-slate-400">{message}</p>
      <div className="space-y-2">
        <div className="h-14 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-14 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-14 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-12 animate-pulse rounded-[8px] bg-slate-100" />
        <div className="h-20 animate-pulse rounded-[10px] bg-slate-100" />
      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="shrink-0 text-blue-400">
      <path
        d="M3.5 1.75L7 5L3.5 8.25"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
