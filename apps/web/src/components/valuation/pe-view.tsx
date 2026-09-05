"use client";

import { Fragment, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  EXPECTED_GROWTH_LIMITS,
  EXPECTED_PE_LIMITS,
  trailingAveragePe,
  valuePe,
  type PeerMultiple,
  type PeChartPeriod,
  type PeInputs,
  type PeSeriesPoint,
  type Quote,
} from "@mystockjournal/shared";
import { api } from "@/lib/api";
import { useDebounced } from "@/hooks/use-debounced";
import type { MethodViewProps } from "./actions";
import { PEER_COLORS, PeChart, type PeChartMode } from "./pe-chart";
import { Card, CardHeader, NumberInput, fmt1, fmt2, fmtSigned } from "./primitives";

const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;
const MAX_PEERS = 8;
const CHART_PERIODS: { id: PeChartPeriod; label: string }[] = [
  { id: "week", label: "周" },
  { id: "month", label: "月" },
  { id: "year", label: "年" },
];

type PeChartResponse = {
  period: PeChartPeriod;
  series: PeSeriesPoint[];
  peers: Array<PeerMultiple & { series: PeSeriesPoint[] }>;
};

export type PeViewProps = MethodViewProps & {
  assumptions: PeInputs;
  onChange: (assumptions: PeInputs) => void;
};

export function PeView({
  anchors,
  currentPrice,
  ticker,
  assumptions,
  onChange,
  myFairValue,
  actions,
}: PeViewProps) {
  const [chartMode, setChartMode] = useState<PeChartMode>("pe");
  const [chartPeriod, setChartPeriod] = useState<PeChartPeriod>("year");
  const [peerTickers, setPeerTickers] = useState<string[]>([]);

  const result = useMemo(() => valuePe(assumptions, currentPrice), [assumptions, currentPrice]);
  const avg5Y = useMemo(() => trailingAveragePe(anchors.peHistory, 5), [anchors.peHistory]);
  const avg10Y = useMemo(() => trailingAveragePe(anchors.peHistory, 10), [anchors.peHistory]);

  const chartQuery = useQuery({
    queryKey: ["valuation-pe-chart", ticker, chartPeriod, peerTickers],
    queryFn: () => {
      const peers = peerTickers.length > 0 ? `&peers=${peerTickers.join(",")}` : "";
      return api<PeChartResponse>(
        `/stocks/${ticker}/valuation/pe/chart?period=${chartPeriod}${peers}`,
      );
    },
    placeholderData: keepPreviousData,
  });

  const chartSeries = chartQuery.data?.series ?? [];
  const peers = useMemo(() => {
    if (peerTickers.length === 0) return [];
    const byTicker = new Map((chartQuery.data?.peers ?? []).map((peer) => [peer.ticker, peer]));
    return peerTickers.map(
      (peerTicker) =>
        byTicker.get(peerTicker) ?? {
          ticker: peerTicker,
          name: peerTicker,
          price: null,
          pe: null,
          peg: null,
          history: [],
          series: [],
          peUnavailableReason: null,
        },
    );
  }, [peerTickers, chartQuery.data]);

  const peerSeries = useMemo(
    () =>
      peers
        .map((peer, index) => ({
          ticker: peer.ticker,
          series: peer.series ?? [],
          color: PEER_COLORS[index % PEER_COLORS.length],
          unavailable: peer.peUnavailableReason != null,
        }))
        .filter((peer) => !peer.unavailable && peer.series.length > 0),
    [peers],
  );

  function setField<K extends keyof PeInputs>(key: K, value: PeInputs[K]) {
    onChange({ ...assumptions, [key]: value });
  }

  function addPeer(peer: string) {
    const next = peer.trim().toUpperCase();
    if (!TICKER_RE.test(next) || next === ticker.toUpperCase()) return;
    setPeerTickers((prev) => (prev.includes(next) ? prev : [...prev, next].slice(0, MAX_PEERS)));
  }

  const periodTitle =
    chartPeriod === "week" ? "Weekly" : chartPeriod === "month" ? "Monthly" : "Annual";

  return (
    <div className="flex flex-col items-start gap-3 md:flex-row md:gap-4">
      <div className="order-last flex min-w-0 flex-col gap-3 md:order-first md:flex-1">
        <blockquote className="rounded-[12px] border-l-4 border-blue-200 bg-white px-4 py-3 md:px-5 md:py-3.5">
          <p className="font-heading text-[15px] leading-relaxed text-slate-700 italic">
            “市盈率单独看没有意义；只有和自身历史、同业与成长性对比时，才有参考价值。”
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            A P/E ratio means little in isolation — it becomes useful only next to a company&apos;s own
            history, its peers, and its growth.
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            — inspired by <span className="italic">The Five Rules for Successful Stock Investing</span>
          </p>
        </blockquote>

        <Card>
          <CardHeader
            title={
              chartMode === "pe"
                ? `${periodTitle} P/E vs. references`
                : `${periodTitle} PEG vs. growth and peers`
            }
            subtitle={`${ticker} · ${
              peerSeries.length > 0
                ? `${peerSeries.length} peer${peerSeries.length > 1 ? "s" : ""} plotted`
                : peers.length > 0
                  ? "no plottable peers"
                  : "no peers added"
            }${chartPeriod !== "year" ? " · price ÷ latest EPS" : ""}`}
            right={
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <div className="flex items-center rounded-lg bg-slate-100 p-[3px]">
                  {CHART_PERIODS.map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setChartPeriod(period.id)}
                      className={`rounded-md px-2.5 py-1.5 text-[12px] font-bold ${
                        chartPeriod === period.id
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center rounded-lg bg-slate-100 p-[3px]">
                  {(["pe", "peg"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChartMode(mode)}
                      className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${
                        chartMode === mode
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            }
          />

          <div className="px-2 py-3">
            {chartQuery.isError ? (
              <div className="flex h-[180px] items-center justify-center px-6 text-center">
                <p className="text-[12px] text-red-500">
                  {chartQuery.error instanceof Error
                    ? chartQuery.error.message
                    : "Failed to load chart series"}
                </p>
              </div>
            ) : (
              <PeChart
                mode={chartMode}
                history={chartSeries}
                peerSeries={peerSeries}
                expectedPe={assumptions.expectedPe}
                expectedGrowth={assumptions.expectedGrowth}
                avg5Y={chartPeriod === "year" ? avg5Y : null}
                avg10Y={chartPeriod === "year" ? avg10Y : null}
                label={ticker}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-4 pb-2 md:gap-4 md:px-5">
            <Legend color="bg-blue-500" label={ticker} solid />
            {chartMode === "pe" ? (
              <>
                {assumptions.expectedPe > 0 && (
                  <Legend color="bg-emerald-500" label={`Expected ${assumptions.expectedPe}×`} solid />
                )}
                {chartPeriod === "year" && avg5Y != null && (
                  <Legend color="bg-slate-400" label={`5Y avg ${fmt1(avg5Y)}×`} />
                )}
                {chartPeriod === "year" && avg10Y != null && (
                  <Legend color="bg-slate-300" label={`10Y avg ${fmt1(avg10Y)}×`} />
                )}
              </>
            ) : (
              <>
                <Legend color="bg-amber-400" label="PEG = 1 (growth-fair)" />
                {assumptions.expectedPe > 0 && (
                  <Legend color="bg-emerald-500" label="PEG at your expected P/E" solid />
                )}
              </>
            )}
            {peerSeries.map((peer) => (
              <Legend
                key={peer.ticker}
                color=""
                label={peer.ticker}
                swatch={peer.color}
              />
            ))}
          </div>

          <PeerComposer
            peerTickers={peerTickers}
            peers={peers}
            selfTicker={ticker}
            loading={chartQuery.isFetching}
            error={chartQuery.error instanceof Error ? chartQuery.error.message : null}
            onAdd={addPeer}
            onRemove={(peer) => setPeerTickers((prev) => prev.filter((item) => item !== peer))}
          />
        </Card>

        <PeerSection
          peers={peers}
          loading={chartQuery.isFetching}
          onRemove={(peer) => setPeerTickers((prev) => prev.filter((item) => item !== peer))}
          onUseMultiple={(value) => setField("expectedPe", Math.round(value * 10) / 10)}
          quickFills={[
            avg5Y != null ? { label: `5Y avg ${fmt1(avg5Y)}×`, value: avg5Y } : null,
            avg10Y != null ? { label: `10Y avg ${fmt1(avg10Y)}×`, value: avg10Y } : null,
            result.currentPe != null
              ? { label: `Current ${fmt1(result.currentPe)}×`, value: result.currentPe }
              : null,
          ].filter((fill): fill is { label: string; value: number } => fill != null)}
        />
      </div>

      <div className="order-first w-full md:order-last md:sticky md:top-[120px] md:w-[288px] md:shrink-0">
        <RightRail
          assumptions={assumptions}
          result={result}
          currentPrice={currentPrice}
          hasFwdEps={anchors.fwdEps != null}
          hasTtmEps={anchors.ttmEps != null}
          avg5Y={avg5Y}
          myFairValue={myFairValue}
          actions={actions}
          onField={setField}
        />
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  solid = false,
  swatch,
}: {
  color: string;
  label: string;
  solid?: boolean;
  swatch?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {swatch ? (
        <div className="size-2 rounded-full" style={{ backgroundColor: swatch }} />
      ) : (
        <div className={`w-4 ${solid ? "h-0.5" : "h-px"} ${color}`} />
      )}
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

/** Search via /quotes/search — same validation path as the watch-list add box. */
function PeerComposer({
  peerTickers,
  peers,
  selfTicker,
  loading,
  error,
  onAdd,
  onRemove,
}: {
  peerTickers: string[];
  peers: Array<PeerMultiple & { series?: PeSeriesPoint[] }>;
  selfTicker: string;
  loading: boolean;
  error: string | null;
  onAdd: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [reasonTicker, setReasonTicker] = useState<string | null>(null);
  const query = draft.trim();
  const debouncedQuery = useDebounced(query, 300);
  const self = selfTicker.toUpperCase();
  const atLimit = peerTickers.length >= MAX_PEERS;
  const peerByTicker = useMemo(
    () => new Map(peers.map((peer) => [peer.ticker, peer])),
    [peers],
  );
  const openReason =
    reasonTicker != null ? (peerByTicker.get(reasonTicker)?.peUnavailableReason ?? null) : null;

  const searchQuery = useQuery({
    queryKey: ["quote-search", debouncedQuery],
    queryFn: () =>
      api<{ items: Quote[] }>(`/quotes/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: !atLimit && debouncedQuery.length > 0 && debouncedQuery === query,
  });

  const hits = useMemo(() => {
    const items = searchQuery.data?.items ?? [];
    return items.filter((item) => {
      const ticker = item.ticker.toUpperCase();
      if (ticker === self) return false;
      if (peerTickers.includes(ticker)) return false;
      return TICKER_RE.test(ticker);
    });
  }, [searchQuery.data, self, peerTickers]);

  const exact = hits.find((item) => item.ticker.toUpperCase() === query.toUpperCase()) ?? null;
  const canAdd = !atLimit && exact != null;

  function addTicker(ticker: string) {
    const next = ticker.trim().toUpperCase();
    if (!TICKER_RE.test(next) || next === self || peerTickers.includes(next) || atLimit) return;
    // Only accept symbols the quote search resolved — mirrors watch-list add.
    const verified =
      hits.some((item) => item.ticker.toUpperCase() === next) || exact?.ticker.toUpperCase() === next;
    if (!verified) return;
    onAdd(next);
    setDraft("");
  }

  function submit() {
    if (!exact) return;
    addTicker(exact.ticker);
  }

  const showDropdown = query.length > 0 && !atLimit;
  const searching = searchQuery.isFetching && debouncedQuery === query;
  const noMatch =
    showDropdown && !searching && debouncedQuery === query && debouncedQuery.length > 0 && hits.length === 0;

  return (
    <div className="border-t border-slate-100 px-4 py-3 md:px-5">
      {peerTickers.length > 0 && (
        <div className="mb-2 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {peerTickers.map((peer, index) => {
              const meta = peerByTicker.get(peer);
              const unavailable = meta?.pe == null && meta?.peUnavailableReason != null;
              const selected = reasonTicker === peer;
              return (
                <span
                  key={peer}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                    unavailable
                      ? "border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <button
                    type="button"
                    disabled={!unavailable}
                    onClick={() =>
                      setReasonTicker((current) => (current === peer ? null : peer))
                    }
                    className={`inline-flex items-center gap-1 ${
                      unavailable ? "cursor-pointer hover:text-slate-500" : "cursor-default"
                    } ${selected ? "underline decoration-slate-300 underline-offset-2" : ""}`}
                    title={unavailable ? "查看原因" : undefined}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor: unavailable
                          ? "#cbd5e1"
                          : PEER_COLORS[index % PEER_COLORS.length],
                      }}
                    />
                    {peer}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reasonTicker === peer) setReasonTicker(null);
                      onRemove(peer);
                    }}
                    className="ml-0.5 text-slate-400 hover:text-red-500"
                    aria-label={`Remove ${peer}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
            {loading && <span className="text-[10px] text-slate-400">Updating chart…</span>}
          </div>
          {openReason != null && reasonTicker != null && (
            <p className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] leading-snug text-slate-500">
              <span className="font-mono font-semibold text-slate-600">{reasonTicker}</span>
              {" — "}
              {openReason}
            </p>
          )}
        </div>
      )}

      <form
        className="relative flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value.toUpperCase())}
          placeholder={atLimit ? `Up to ${MAX_PEERS} peers` : "Search ticker to compare…"}
          maxLength={16}
          disabled={atLimit}
          autoComplete="off"
          className="flex-1 rounded-[7px] border border-slate-200 px-2.5 py-1.5 font-mono text-[12px] text-slate-800 outline-none placeholder:font-sans placeholder:text-slate-300 focus:border-blue-400 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!canAdd}
          className="rounded-[7px] bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Compare
        </button>

        {showDropdown && (
          <div className="absolute right-0 bottom-[calc(100%+4px)] left-0 z-20 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-md">
            {searching && (
              <p className="px-3 py-2 text-[11px] text-slate-400">Searching market…</p>
            )}
            {!searching &&
              hits.slice(0, 6).map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => addTicker(item.ticker)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="font-mono text-[12px] font-bold text-slate-800">{item.ticker}</span>
                  <span className="truncate text-[11px] text-slate-400">{item.name}</span>
                </button>
              ))}
            {noMatch && (
              <p className="px-3 py-2 text-[11px] text-slate-400">
                No tickers match “{query}”
              </p>
            )}
          </div>
        )}
      </form>

      {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
      {peerTickers.length === 0 && !error && !showDropdown && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          Search a competitor the same way as the watch list — only resolved tickers can be compared.
        </p>
      )}
    </div>
  );
}

function RightRail({
  assumptions,
  result,
  currentPrice,
  hasFwdEps,
  hasTtmEps,
  avg5Y,
  myFairValue,
  actions,
  onField,
}: {
  assumptions: PeInputs;
  result: ReturnType<typeof valuePe>;
  currentPrice: number;
  hasFwdEps: boolean;
  hasTtmEps: boolean;
  avg5Y: number | null;
  myFairValue: number | null;
  actions: MethodViewProps["actions"];
  onField: <K extends keyof PeInputs>(key: K, value: PeInputs[K]) => void;
}) {
  const undervalued = result.mos >= 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-1">
        <Card className="px-3.5 py-3.5 md:px-[18px] md:py-4">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-slate-900">Expected P/E</p>
              <p className="mt-px text-[10px] text-slate-400">Your judgment multiple</p>
            </div>
            {avg5Y != null && (
              <button
                type="button"
                onClick={() => onField("expectedPe", Math.round(avg5Y * 10) / 10)}
                className="shrink-0 rounded-md border border-dashed border-slate-200 px-[7px] py-1 text-[10px] font-semibold text-slate-400 hover:border-blue-400 hover:text-blue-600"
              >
                5Y avg
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-[10px] border-2 border-slate-200 bg-white px-3.5 py-2 focus-within:border-blue-400">
            <NumberInput
              value={assumptions.expectedPe}
              limits={EXPECTED_PE_LIMITS}
              onCommit={(value) => onField("expectedPe", value)}
              ariaLabel="Expected P/E"
              className="min-w-0 flex-1 text-[32px] font-bold text-slate-900"
            />
            <span className="text-[18px] font-semibold text-slate-400">×</span>
          </div>

          <div className="mt-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">EPS</span>
              <div className="flex items-center rounded-md bg-slate-100 p-0.5">
                {(
                  [
                    { basis: "ttm", label: "TTM", available: hasTtmEps },
                    { basis: "fwd", label: "Forward", available: hasFwdEps },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.basis}
                    type="button"
                    disabled={!option.available}
                    onClick={() => onField("epsBasis", option.basis)}
                    className={`rounded-[5px] px-2 py-[3px] text-[10px] font-bold disabled:opacity-40 ${
                      assumptions.epsBasis === option.basis
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[7px] border border-slate-100 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">
                {assumptions.epsBasis === "ttm" ? "TTM EPS (actual)" : "Forward EPS (next 12 months)"}
              </span>
              <span className="font-mono text-[13px] font-bold text-slate-800 tabular-nums">
                ${fmt2(result.eps)}
              </span>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              Fair value = {assumptions.expectedPe}× × ${fmt2(result.eps)}
            </p>
          </div>
        </Card>

        <div
          className={`rounded-[14px] border px-3.5 py-3.5 md:px-[18px] md:py-4 ${
            undervalued ? "border-emerald-100 bg-emerald-50" : "border-red-100 bg-red-50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              Fair value / share
            </span>
            {myFairValue !== null && (
              <span className="rounded-full border border-emerald-200 bg-white px-[7px] py-0.5 text-[10px] font-bold text-emerald-700">
                MFV ${fmt2(myFairValue)}
              </span>
            )}
          </div>
          <span
            className={`mt-1.5 block font-mono text-[32px] leading-none font-bold tabular-nums md:text-[48px] ${
              undervalued ? "text-emerald-700" : "text-red-500"
            }`}
          >
            ${fmt2(result.fairValue)}
          </span>
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between rounded-[7px] bg-white px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">Current price</span>
              <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">
                ${fmt2(currentPrice)}
              </span>
            </div>
            <div
              className={`flex items-center justify-between rounded-[7px] px-2.5 py-1.5 ${
                undervalued ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              <span
                className={`text-[11px] font-bold ${undervalued ? "text-emerald-700" : "text-red-600"}`}
              >
                Margin of safety
              </span>
              <span
                className={`font-mono text-[14px] font-bold tabular-nums ${
                  undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {fmtSigned(result.mos)}
              </span>
            </div>
          </div>
          <p
            className={`mt-2 text-[11px] leading-snug font-semibold ${
              undervalued ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {undervalued
              ? `Price sits ${fmt1(result.mos)}% below your fair value`
              : `Price sits ${fmt1(Math.abs(result.mos))}% above your fair value`}
          </p>
        </div>
      </div>

      <Card className="hidden px-[18px] py-3.5 md:block">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold text-slate-900">PEG</p>
          <span className="text-[10px] text-slate-400">growth-adjusted lens</span>
        </div>

        <div className="flex items-center gap-1 rounded-[7px] border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-blue-300">
          <span className="shrink-0 text-[10px] text-slate-400">Expected growth</span>
          <NumberInput
            value={assumptions.expectedGrowth}
            limits={EXPECTED_GROWTH_LIMITS}
            onCommit={(value) => onField("expectedGrowth", value)}
            ariaLabel="Expected earnings growth"
            className="min-w-0 flex-1 text-right text-[13px] font-bold text-slate-900"
          />
          <span className="shrink-0 text-[10px] text-slate-400">%</span>
        </div>

        {result.pegAtExpectedPe == null ? (
          <p className="mt-2.5 text-[11px] leading-snug text-slate-400">
            PEG needs positive earnings and positive growth. On this EPS basis it does not apply.
          </p>
        ) : (
          <>
            <div className="mt-2.5 flex flex-col gap-0.5">
              {[
                {
                  label: "Current PEG",
                  value: result.currentPeg,
                  note:
                    result.currentPe == null
                      ? ""
                      : `${fmt1(result.currentPe)}× ÷ ${assumptions.expectedGrowth}%`,
                },
                {
                  label: "PEG at your expected P/E",
                  value: result.pegAtExpectedPe,
                  note: `${assumptions.expectedPe}× ÷ ${assumptions.expectedGrowth}%`,
                  highlight: true,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between gap-2 rounded-[7px] px-2.5 py-1.5 ${
                    row.highlight ? "border border-slate-100 bg-slate-50" : ""
                  }`}
                >
                  <div>
                    <span
                      className={`text-[11px] ${row.highlight ? "font-bold text-slate-700" : "text-slate-500"}`}
                    >
                      {row.label}
                    </span>
                    {row.note && <p className="text-[9px] text-slate-400">{row.note}</p>}
                  </div>
                  <span
                    className={`font-mono text-[13px] font-bold tabular-nums ${
                      row.highlight ? "text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {row.value == null ? "—" : fmt2(row.value)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-1.5 border-t border-slate-100 pt-2">
              <p className="mb-1.5 text-[10px] text-slate-400">Implied P/E at a target PEG:</p>
              <div className="flex gap-1.5">
                {[
                  { label: "PEG = 1", value: result.impliedPeAtPeg1 },
                  { label: "PEG = 2", value: result.impliedPeAtPeg2 },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    disabled={option.value == null}
                    onClick={() =>
                      option.value != null &&
                      onField("expectedPe", Math.round(option.value * 10) / 10)
                    }
                    className="flex flex-1 flex-col items-center rounded-[7px] border border-slate-100 bg-slate-50 py-1.5 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <span className="text-[9px] text-slate-400">{option.label}</span>
                    <span className="font-mono text-[12px] font-bold text-slate-800">
                      {option.value == null ? "—" : `${fmt1(option.value)}×`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      <button
        type="button"
        onClick={actions.onSetFairValue}
        disabled={actions.saving || result.fairValue <= 0}
        className="rounded-[9px] bg-emerald-600 py-2.5 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {actions.saving ? "Saving…" : "Set as My Fair Value"}
      </button>
    </div>
  );
}

function PeerSection({
  peers,
  loading,
  onRemove,
  onUseMultiple,
  quickFills,
}: {
  peers: PeerMultiple[];
  loading: boolean;
  onRemove: (ticker: string) => void;
  onUseMultiple: (value: number) => void;
  quickFills: { label: string; value: number }[];
}) {
  const [reasonTicker, setReasonTicker] = useState<string | null>(null);

  if (peers.length === 0 && quickFills.length === 0) return null;

  return (
    <Card className="px-4 py-4 md:px-5">
      <div className="mb-3">
        <p className="text-[13px] font-bold text-slate-900">Peer multiples</p>
        <p className="mt-px text-[11px] text-slate-400">
          Live price ÷ EPS for peers already on the chart. 无 P/E 的标的会置灰，点击可看原因。
        </p>
      </div>

      {peers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[360px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Ticker", "Price", "P/E", "PEG", ""].map((heading) => (
                  <th key={heading} className="px-3 py-1.5">
                    <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      {heading}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peers.map((peer, index) => {
                const unavailable = peer.pe == null && peer.peUnavailableReason != null;
                const open = reasonTicker === peer.ticker;
                return (
                  <Fragment key={peer.ticker}>
                    <tr
                      className={`border-b border-slate-50 last:border-0 ${
                        unavailable ? "bg-slate-50/80 text-slate-400" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="px-3 py-[7px]">
                        <button
                          type="button"
                          disabled={!unavailable}
                          onClick={() =>
                            setReasonTicker((current) =>
                              current === peer.ticker ? null : peer.ticker,
                            )
                          }
                          className={`flex items-center gap-1.5 text-left ${
                            unavailable ? "cursor-pointer hover:text-slate-500" : "cursor-default"
                          }`}
                          title={unavailable ? "查看原因" : undefined}
                        >
                          <div
                            className="size-[7px] shrink-0 rounded-full"
                            style={{
                              backgroundColor: unavailable
                                ? "#cbd5e1"
                                : PEER_COLORS[index % PEER_COLORS.length],
                            }}
                          />
                          <span
                            className={`font-mono text-[12px] font-bold ${
                              unavailable ? "text-slate-400" : "text-slate-800"
                            } ${open ? "underline decoration-slate-300 underline-offset-2" : ""}`}
                          >
                            {peer.ticker}
                          </span>
                          {loading && peer.pe == null && peer.price == null && !unavailable && (
                            <span className="text-[10px] text-slate-400">…</span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-[7px]">
                        <span
                          className={`font-mono text-[12px] tabular-nums ${
                            unavailable ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {peer.price == null ? "—" : `$${fmt2(peer.price)}`}
                        </span>
                      </td>
                      <td className="px-3 py-[7px]">
                        <span
                          className={`font-mono text-[12px] font-semibold tabular-nums ${
                            unavailable ? "text-slate-400" : "text-slate-700"
                          }`}
                        >
                          {peer.pe == null ? "—" : `${fmt1(peer.pe)}×`}
                        </span>
                      </td>
                      <td className="px-3 py-[7px]">
                        <span
                          className={`font-mono text-[12px] tabular-nums ${
                            unavailable ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {peer.peg == null ? "—" : fmt2(peer.peg)}
                        </span>
                      </td>
                      <td className="px-3 py-[7px] text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (reasonTicker === peer.ticker) setReasonTicker(null);
                            onRemove(peer.ticker);
                          }}
                          className="text-[10px] text-slate-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                    {open && peer.peUnavailableReason != null && (
                      <tr className="border-b border-slate-50 bg-slate-50">
                        <td colSpan={5} className="px-3 py-2">
                          <p className="text-[11px] leading-snug text-slate-500">
                            {peer.peUnavailableReason}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {quickFills.length > 0 && (
        <div className={`${peers.length > 0 ? "mt-2" : ""} flex flex-wrap items-center gap-1.5`}>
          <span className="text-[10px] text-slate-400">Set expected P/E →</span>
          {quickFills.map((fill) => (
            <button
              key={fill.label}
              type="button"
              onClick={() => onUseMultiple(fill.value)}
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
            >
              {fill.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
