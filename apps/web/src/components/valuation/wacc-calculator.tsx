"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_EQUITY_RISK_PREMIUM,
  DRIVER_LIMITS,
  WACC_BUILD_LIMITS,
  computeWacc,
  type FilingRef,
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

function locked(source: WaccFieldSource) {
  return source === "filing" || source === "yahoo";
}

function pct(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function clampWacc(wacc: number) {
  return Math.max(DRIVER_LIMITS.wacc.min, wacc);
}

function outerWaccReady(value: number, savedBuild?: WaccBuild) {
  return value >= DRIVER_LIMITS.wacc.min && savedBuild != null;
}

function reportFiling(filings: FilingRef[] | undefined) {
  if (!filings?.length) return undefined;
  return filings.find((filing) => filing.form === "10-K" || filing.form === "10-Q") ?? filings[0];
}

function filingSourceLink(
  source: WaccFieldSource,
  filings: FilingRef[] | undefined,
): { label: string; url: string; title?: string } | undefined {
  if (source !== "filing") return undefined;
  const filing = reportFiling(filings);
  if (!filing) return undefined;
  const period = filing.reportDate || filing.filingDate;
  return {
    label: filing.form,
    url: filing.url,
    title: period ? `${filing.form} · ${period}` : filing.form,
  };
}

function buildFromFacts(data: WaccInputsResponse, savedBuild?: WaccBuild): WaccBuild {
  return {
    equity: data.equity,
    debt: data.debt,
    rf: data.rf ?? savedBuild?.rf ?? null,
    beta: data.beta ?? savedBuild?.beta ?? null,
    erp: savedBuild?.erp ?? DEFAULT_EQUITY_RISK_PREMIUM,
    preTaxCostOfDebt: data.preTaxCostOfDebt ?? savedBuild?.preTaxCostOfDebt ?? null,
    taxRate: data.taxRate ?? savedBuild?.taxRate ?? null,
  };
}

function mergeAiPrefill(build: WaccBuild, prefill: WaccPrefillResponse): WaccBuild {
  return {
    ...build,
    erp: prefill.erp,
    rf: build.rf ?? prefill.rf ?? null,
    beta: build.beta ?? prefill.beta ?? null,
    preTaxCostOfDebt: build.preTaxCostOfDebt ?? prefill.preTaxCostOfDebt ?? null,
    taxRate: build.taxRate ?? prefill.taxRate ?? null,
  };
}

async function fetchAiPrefill(ticker: string, data: WaccInputsResponse) {
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
  return payload.prefill;
}

export function WaccDriverButton({
  label,
  hint,
  value,
  ticker,
  termGrowth,
  savedBuild,
  sourceFilings,
  onApply,
  compact = false,
}: {
  label: string;
  hint: string;
  value: number;
  ticker: string;
  termGrowth: number;
  savedBuild?: WaccBuild;
  sourceFilings?: FilingRef[];
  onApply: (wacc: number, build: WaccBuild) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [prefillHint, setPrefillHint] = useState(false);
  const [failedTicker, setFailedTicker] = useState<string | null>(null);
  const alreadyReady = outerWaccReady(value, savedBuild);
  const onApplyRef = useRef(onApply);
  const unset = value < DRIVER_LIMITS.wacc.min;
  const showLoading = !alreadyReady && failedTicker !== ticker;

  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  useEffect(() => {
    if (alreadyReady) return;
    let cancelled = false;
    async function prefillOuter() {
      try {
        const data = await api<WaccInputsResponse>(`/stocks/${ticker}/valuation/wacc-inputs`);
        if (cancelled) return;
        let build = buildFromFacts(data);
        if (computeWacc(build).wacc == null) {
          try {
            build = mergeAiPrefill(build, await fetchAiPrefill(ticker, data));
          } catch {
            // Quota or network — leave the outer field empty; the modal can retry.
          }
        }
        if (cancelled) return;
        const wacc = computeWacc(build).wacc;
        if (wacc != null) {
          onApplyRef.current(clampWacc(wacc), build);
        } else if (!cancelled) {
          setFailedTicker(ticker);
        }
      } catch {
        if (!cancelled) setFailedTicker(ticker);
      } finally {
        if (!cancelled) setPrefillHint(false);
      }
    }
    void prefillOuter();
    return () => {
      cancelled = true;
    };
  }, [alreadyReady, ticker]);

  function handleOpen() {
    if (showLoading) {
      setPrefillHint(true);
      return;
    }
    setOpen(true);
  }

  const valueLabel = showLoading ? (
    <span
      className={`block animate-pulse rounded bg-blue-200/80 ${compact ? "h-3.5 w-12" : "h-4 w-full"}`}
      aria-hidden
    />
  ) : (
    <span className={compact ? "w-12 text-right" : "w-full"}>{unset ? "—" : value.toFixed(1)}</span>
  );

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
              aria-label={showLoading ? t("waccCalc.prefilling") : t("waccCalc.openAria")}
              aria-busy={showLoading}
              onClick={handleOpen}
              className="flex items-center gap-1 rounded-[7px] border border-blue-200 bg-blue-50 px-2 py-1 text-left hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="font-mono text-[12px] font-bold text-blue-900 tabular-nums">{valueLabel}</span>
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
              aria-label={showLoading ? t("waccCalc.prefilling") : t("waccCalc.openAria")}
              aria-busy={showLoading}
              onClick={handleOpen}
              className="flex items-center gap-1 rounded-[7px] border border-blue-200 bg-blue-50 px-2.5 py-[7px] text-left transition-colors hover:border-blue-400 hover:bg-blue-100"
            >
              <span className="w-full font-mono text-[14px] font-bold text-blue-900 tabular-nums">
                {valueLabel}
              </span>
              <span className="shrink-0 text-[11px] text-blue-500">%</span>
              <ChevronRight />
            </button>
          </>
        )}
        {prefillHint ? (
          <p className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-[10px] leading-snug text-blue-700">
            {t("waccCalc.prefilling")}
          </p>
        ) : hintOpen ? (
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
          sourceFilings={sourceFilings}
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
  sourceFilings,
  onClose,
  onApply,
}: {
  ticker: string;
  termGrowth: number;
  savedBuild?: WaccBuild;
  sourceFilings?: FilingRef[];
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
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingFacts(true);
      setError(null);
      try {
        const data = await api<WaccInputsResponse>(`/stocks/${ticker}/valuation/wacc-inputs`);
        if (cancelled) return;
        setFacts(data);
        const next = buildFromFacts(data, savedBuild);
        // Default ERP is only for the outer auto-prefill. The modal waits for AI unless the user already applied.
        if (savedBuild?.erp == null) next.erp = null;
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
          const prefill = await fetchAiPrefill(ticker, data);
          if (cancelled) return;
          setNote(prefill.note);
          setBuild((current) => (current ? mergeAiPrefill(current, prefill) : current));
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
    computed.wacc >= DRIVER_LIMITS.wacc.min;

  function patch(partial: Partial<WaccBuild>, sourceKey?: keyof WaccInputsResponse["sources"]) {
    setBuild((current) => (current ? { ...current, ...partial } : current));
    if (sourceKey) {
      setSources((current) => (current ? { ...current, [sourceKey]: "user" } : current));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="wacc-calc-title"
        aria-busy={loadingFacts || loadingAi}
        className="flex max-h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden rounded-t-[18px] border border-slate-200 bg-white shadow-xl sm:max-h-[min(92dvh,40rem)] sm:rounded-[18px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 bg-sky-50 px-4 py-3">
          <div className="min-w-0">
            <h2 id="wacc-calc-title" className="text-[16px] font-bold text-slate-900">
              {t("waccCalc.title")}
            </h2>
            <p className="mt-0.5 break-words font-mono text-[10px] text-sky-700">{t("waccCalc.formula")}</p>
          </div>
          <button
            type="button"
            aria-label={t("waccCalc.closeAria")}
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
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
                  source={filingSourceLink(sources.preTaxCostOfDebt, sourceFilings)}
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
                  source={filingSourceLink(sources.taxRate, sourceFilings)}
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
            </>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between rounded-[10px] bg-slate-900 px-3.5 py-2.5 text-white">
            <span className="text-[11px] font-bold tracking-wide uppercase">{t("waccCalc.result")}</span>
            <span className="font-mono text-[22px] font-bold tabular-nums">{pct(computed?.wacc, 1)}</span>
          </div>
          {waccTooLow ? (
            <p className="text-[11px] font-medium text-red-500">
              {t("waccCalc.waccTooLow", { g: termGrowth.toFixed(1) })}
            </p>
          ) : !loadingFacts && computed?.wacc == null ? (
            <p className="text-[11px] text-slate-500">{t("waccCalc.needInputs")}</p>
          ) : null}
          <button
            type="button"
            disabled={!canApply || !facts || loadingAi}
            onClick={() => {
              if (!canApply || computed?.wacc == null || !build) return;
              const wacc = clampWacc(computed.wacc);
              onApply(wacc, build);
            }}
            className="w-full rounded-[10px] bg-blue-600 py-2.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t("waccCalc.apply")}
          </button>
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
  source?: { label: string; url: string; title?: string };
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
              title={source.title ?? source.label}
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
