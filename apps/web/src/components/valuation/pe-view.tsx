"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  EXPECTED_EV_EBITDA_LIMITS,
  EXPECTED_GROWTH_LIMITS,
  EXPECTED_PE_LIMITS,
  evEbitdaInputsFromAnchors,
  evEbitdaUnavailableReason,
  peUnavailableReason,
  trailingAverageEvEbitda,
  trailingAveragePe,
  valueEvEbitda,
  valuePe,
  type AnchorSourceRef,
  type EvEbitdaInputs,
  type EvEbitdaSeriesPoint,
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
import { Card, CardHeader, NumberInput, SourceHint, fmt1, fmt2, fmtMoneyM, fmtSigned } from "./primitives";

export type MultiplesView = "pe" | "peg" | "evebitda";
export type MultiplesLens = "pe" | "evebitda";

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

type EvChartResponse = {
  period: PeChartPeriod;
  series: EvEbitdaSeriesPoint[];
  peers: Array<PeerMultiple & { series: EvEbitdaSeriesPoint[] }>;
};

function toChartPoint(point: {
  label: string;
  pe?: number;
  growth?: number | null;
  evEbitda?: number | null;
}): PeSeriesPoint {
  return {
    label: point.label,
    pe: point.pe ?? 0,
    growth: point.growth ?? null,
    evEbitda: point.evEbitda ?? null,
  };
}

export type PeViewProps = MethodViewProps & {
  lens: MultiplesLens;
  onLens: (lens: MultiplesLens) => void;
  peAssumptions: PeInputs;
  onPeChange: (assumptions: PeInputs) => void;
  evAssumptions: EvEbitdaInputs;
  onEvChange: (assumptions: EvEbitdaInputs) => void;
};

export function PeView({
  anchors,
  currentPrice,
  ticker,
  lens,
  onLens,
  peAssumptions,
  onPeChange,
  evAssumptions,
  onEvChange,
  myFairValue,
  actions,
}: PeViewProps) {
  const [view, setView] = useState<MultiplesView>(lens === "evebitda" ? "evebitda" : "pe");
  const [chartPeriod, setChartPeriod] = useState<PeChartPeriod>("year");
  const [peerTickers, setPeerTickers] = useState<string[]>([]);
  const evLens = view === "evebitda";
  const pegView = view === "peg";
  const peerLens: MultiplesLens = evLens ? "evebitda" : "pe";
  const chartMode: PeChartMode = view === "evebitda" ? "evebitda" : view;

  useEffect(() => {
    setView((current) => {
      if (lens === "evebitda") return "evebitda";
      return current === "evebitda" ? "pe" : current;
    });
  }, [lens]);

  function selectView(next: MultiplesView) {
    setView(next);
    onLens(next === "evebitda" ? "evebitda" : "pe");
  }

  const peResult = useMemo(() => valuePe(peAssumptions, currentPrice), [peAssumptions, currentPrice]);
  const peBlockedReason = evLens ? null : peUnavailableReason(currentPrice, peResult.eps);
  const evBlockedReason = evLens
    ? evEbitdaUnavailableReason(currentPrice, anchors.ttmEbitda)
    : null;
  const multipleBlockedReason = evLens ? evBlockedReason : peBlockedReason;
  const evInputs = useMemo(
    () =>
      evEbitdaInputsFromAnchors(
        anchors,
        Number.isFinite(evAssumptions?.expectedEvEbitda) ? evAssumptions.expectedEvEbitda : 0,
      ),
    [anchors, evAssumptions],
  );
  const evResult = useMemo(
    () => valueEvEbitda(evInputs, currentPrice),
    [evInputs, currentPrice],
  );
  const peAvg5Y = useMemo(() => trailingAveragePe(anchors.peHistory, 5), [anchors.peHistory]);
  const peAvg10Y = useMemo(() => trailingAveragePe(anchors.peHistory, 10), [anchors.peHistory]);

  const chartQuery = useQuery({
    queryKey: [
      "valuation-multiples-chart",
      evLens ? "evebitda" : "pe",
      ticker,
      chartPeriod,
      multipleBlockedReason != null ? [] : peerTickers,
    ],
    queryFn: async () => {
      const peers =
        multipleBlockedReason == null && peerTickers.length > 0
          ? `&peers=${peerTickers.join(",")}`
          : "";
      const path = evLens ? "evebitda" : "pe";
      return api<PeChartResponse | EvChartResponse>(
        `/stocks/${ticker}/valuation/${path}/chart?period=${chartPeriod}${peers}`,
      );
    },
    placeholderData: keepPreviousData,
  });

  const chartSeries = useMemo(
    () => (chartQuery.data?.series ?? []).map(toChartPoint),
    [chartQuery.data],
  );
  const hasPlottableSeries = useMemo(() => {
    if (evLens) return chartSeries.some((point) => point.evEbitda != null);
    if (pegView) {
      return chartSeries.some(
        (point) => point.pe > 0 && point.growth != null && point.growth > 0,
      );
    }
    return chartSeries.some((point) => point.pe > 0);
  }, [chartSeries, evLens, pegView]);
  const noSeriesReason =
    multipleBlockedReason == null &&
    chartQuery.isFetched &&
    !chartQuery.isFetching &&
    !hasPlottableSeries
      ? evLens
        ? "暂无 EV/EBITDA 历史，无法对比。"
        : pegView
          ? "暂无 PEG 历史，无法对比。"
          : "暂无 P/E 历史，无法对比。"
      : null;
  const blockedReason = multipleBlockedReason ?? noSeriesReason;
  const compareDisabled = blockedReason != null;
  const evHistory = useMemo(
    () =>
      chartSeries.filter((point): point is PeSeriesPoint & { evEbitda: number } => point.evEbitda != null),
    [chartSeries],
  );
  const evAvg5Y = useMemo(() => trailingAverageEvEbitda(evHistory, 5), [evHistory]);
  const evAvg10Y = useMemo(() => trailingAverageEvEbitda(evHistory, 10), [evHistory]);
  const avg5Y = evLens ? evAvg5Y : peAvg5Y;
  const avg10Y = evLens ? evAvg10Y : peAvg10Y;

  const peers = useMemo(() => {
    if (peerTickers.length === 0) return [];
    const byTicker = new Map((chartQuery.data?.peers ?? []).map((peer) => [peer.ticker, peer]));
    return peerTickers.map((peerTicker) => {
      const found = byTicker.get(peerTicker);
      if (!found) {
        return {
          ticker: peerTicker,
          name: peerTicker,
          price: null,
          pe: null,
          peg: null,
          history: [],
          series: [] as PeSeriesPoint[],
          peUnavailableReason: null,
          evEbitda: null,
          evEbitdaUnavailableReason: null,
        };
      }
      return { ...found, series: (found.series ?? []).map(toChartPoint) };
    });
  }, [peerTickers, chartQuery.data]);

  const peerSeries = useMemo(
    () =>
      peers
        .map((peer, index) => ({
          ticker: peer.ticker,
          series: peer.series ?? [],
          color: PEER_COLORS[index % PEER_COLORS.length],
          unavailable: evLens
            ? peer.evEbitdaUnavailableReason != null
            : peer.peUnavailableReason != null,
        }))
        .filter((peer) => !peer.unavailable && peer.series.length > 0),
    [peers, evLens],
  );

  function setPeField<K extends keyof PeInputs>(key: K, value: PeInputs[K]) {
    onPeChange({ ...peAssumptions, [key]: value });
  }

  function setEvField<K extends keyof EvEbitdaInputs>(key: K, value: EvEbitdaInputs[K]) {
    onEvChange({ ...evInputs, [key]: value });
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
            “倍数单独看没有意义；只有和自身历史、同业对比时，才有参考价值。”
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            A multiple means little in isolation — it becomes useful only next to a company&apos;s own
            history and its peers.
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            — inspired by <span className="italic">The Five Rules for Successful Stock Investing</span>
          </p>
        </blockquote>

        <Card>
          <CardHeader
            title={
              view === "evebitda"
                ? `${periodTitle} EV/EBITDA vs. peers`
                : view === "peg"
                  ? `${periodTitle} PEG vs. growth and peers`
                  : `${periodTitle} P/E vs. peers`
            }
            subtitle={`${ticker} · ${
              peerSeries.length > 0
                ? `${peerSeries.length} peer${peerSeries.length > 1 ? "s" : ""} plotted`
                : peers.length > 0
                  ? "no plottable peers"
                  : "no peers added"
            }${
              chartPeriod !== "year"
                ? evLens
                  ? " · EV ÷ latest EBITDA"
                  : " · price ÷ latest EPS"
                : ""
            }`}
            right={
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <div className="flex items-center rounded-lg bg-slate-100 p-[3px]">
                  {(
                    [
                      { id: "pe" as const, label: "P/E" },
                      { id: "peg" as const, label: "PEG" },
                      { id: "evebitda" as const, label: "EV/EBITDA" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectView(option.id)}
                      className={`rounded-md px-2.5 py-1.5 text-[12px] font-bold ${
                        view === option.id
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
              </div>
            }
          />

          <div className="px-2 py-3">
            {chartQuery.isError ? (
              <div className="flex h-[180px] items-center justify-center px-6 text-center">
                <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-semibold text-red-700">
                  {chartQuery.error instanceof Error
                    ? chartQuery.error.message
                    : "Failed to load chart series"}
                </p>
              </div>
            ) : blockedReason ? (
              <div className="flex h-[180px] items-center justify-center px-6 text-center">
                <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-semibold text-red-700">
                  {blockedReason}
                </p>
              </div>
            ) : (
              <PeChart
                mode={chartMode}
                history={chartSeries}
                peerSeries={peerSeries}
                expectedPe={peAssumptions.expectedPe}
                expectedEvEbitda={evInputs.expectedEvEbitda}
                expectedGrowth={peAssumptions.expectedGrowth}
                avg5Y={chartPeriod === "year" ? avg5Y : null}
                avg10Y={chartPeriod === "year" ? avg10Y : null}
                label={ticker}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-4 pb-2 md:gap-4 md:px-5">
            <Legend
              color={evLens ? "bg-teal-600" : pegView ? "bg-violet-500" : "bg-blue-500"}
              label={ticker}
              solid
            />
            {evLens || view === "pe" ? (
              <>
                {(evLens ? evInputs.expectedEvEbitda : peAssumptions.expectedPe) > 0 && (
                  <Legend
                    color="bg-emerald-500"
                    label={`Expected ${evLens ? evInputs.expectedEvEbitda : peAssumptions.expectedPe}×`}
                    solid
                  />
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
                {peAssumptions.expectedPe > 0 && (
                  <Legend color="bg-emerald-500" label="PEG at your expected P/E" solid />
                )}
              </>
            )}
            {!compareDisabled &&
              peerSeries.map((peer) => (
              <Legend
                key={peer.ticker}
                color=""
                label={peer.ticker}
                swatch={peer.color}
              />
            ))}
          </div>

          {compareDisabled ? (
            <div className="border-t border-slate-100 px-4 py-3 md:px-5">
              <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-semibold text-red-700">
                {blockedReason} 无法添加同业对比。
              </p>
            </div>
          ) : (
            <PeerComposer
              lens={peerLens}
              peerTickers={peerTickers}
              peers={peers}
              selfTicker={ticker}
              loading={chartQuery.isFetching}
              error={chartQuery.error instanceof Error ? chartQuery.error.message : null}
              onAdd={addPeer}
              onRemove={(peer) => setPeerTickers((prev) => prev.filter((item) => item !== peer))}
            />
          )}
        </Card>

        <PeerSection
          lens={peerLens}
          peers={compareDisabled ? [] : peers}
          loading={chartQuery.isFetching && !compareDisabled}
          onRemove={(peer) => setPeerTickers((prev) => prev.filter((item) => item !== peer))}
          onUseMultiple={(value) => {
            const rounded = Math.round(value * 10) / 10;
            if (evLens) setEvField("expectedEvEbitda", rounded);
            else setPeField("expectedPe", rounded);
          }}
          quickFills={[
            avg5Y != null ? { label: `5Y avg ${fmt1(avg5Y)}×`, value: avg5Y } : null,
            avg10Y != null ? { label: `10Y avg ${fmt1(avg10Y)}×`, value: avg10Y } : null,
            evLens
              ? evResult.currentMultiple != null
                ? { label: `Current ${fmt1(evResult.currentMultiple)}×`, value: evResult.currentMultiple }
                : null
              : peResult.currentPe != null
                ? { label: `Current ${fmt1(peResult.currentPe)}×`, value: peResult.currentPe }
                : null,
          ].filter((fill): fill is { label: string; value: number } => fill != null)}
        />
      </div>

      <div className="order-first w-full md:order-last md:sticky md:top-[120px] md:w-[288px] md:shrink-0">
        {evLens ? (
          <EvRightRail
            assumptions={evInputs}
            result={evResult}
            currentPrice={currentPrice}
            avg5Y={avg5Y}
            myFairValue={myFairValue}
            actions={actions}
            onField={setEvField}
          />
        ) : pegView ? (
          <PegRightRail
            assumptions={peAssumptions}
            result={peResult}
            currentPrice={currentPrice}
            hasFairValue={
              peAssumptions.epsBasis === "fwd" ? anchors.fwdEps != null : anchors.ttmEps != null
            }
            myFairValue={myFairValue}
            actions={actions}
            onField={setPeField}
          />
        ) : (
          <RightRail
            assumptions={peAssumptions}
            result={peResult}
            currentPrice={currentPrice}
            hasFwdEps={anchors.fwdEps != null}
            hasTtmEps={anchors.ttmEps != null}
            fwdEpsSource={anchors.fwdEpsSource}
            avg5Y={avg5Y}
            myFairValue={myFairValue}
            actions={actions}
            onField={setPeField}
          />
        )}
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
  lens,
  peerTickers,
  peers,
  selfTicker,
  loading,
  error,
  onAdd,
  onRemove,
}: {
  lens: MultiplesLens;
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
    reasonTicker == null
      ? null
      : lens === "evebitda"
        ? (peerByTicker.get(reasonTicker)?.evEbitdaUnavailableReason ?? null)
        : (peerByTicker.get(reasonTicker)?.peUnavailableReason ?? null);

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
              const unavailable =
                lens === "evebitda"
                  ? meta?.evEbitda == null && meta?.evEbitdaUnavailableReason != null
                  : meta?.pe == null && meta?.peUnavailableReason != null;
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
  fwdEpsSource,
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
  fwdEpsSource: AnchorSourceRef | null;
  avg5Y: number | null;
  myFairValue: number | null;
  actions: MethodViewProps["actions"];
  onField: <K extends keyof PeInputs>(key: K, value: PeInputs[K]) => void;
}) {
  const hasFairValue =
    assumptions.epsBasis === "fwd" ? hasFwdEps : hasTtmEps;
  const undervalued = hasFairValue && result.mos >= 0;

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
                    { basis: "ttm" as const, label: "TTM" },
                    { basis: "fwd" as const, label: "Forward" },
                  ]
                ).map((option) => (
                  <button
                    key={option.basis}
                    type="button"
                    onClick={() => onField("epsBasis", option.basis)}
                    className={`rounded-[5px] px-2 py-[3px] text-[10px] font-bold ${
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
                {hasFairValue ? `$${fmt2(result.eps)}` : "—"}
              </span>
            </div>
            {assumptions.epsBasis === "fwd" && fwdEpsSource ? (
              <SourceHint source={fwdEpsSource} />
            ) : null}
            <p className="mt-1.5 text-center text-[10px] text-slate-400">
              {hasFairValue
                ? `Fair value = ${assumptions.expectedPe}× × $${fmt2(result.eps)}`
                : "Fair value = —"}
            </p>
          </div>
        </Card>

        <div
          className={`rounded-[14px] border px-3.5 py-3.5 md:px-[18px] md:py-4 ${
            !hasFairValue
              ? "border-slate-100 bg-slate-50"
              : undervalued
                ? "border-emerald-100 bg-emerald-50"
                : "border-red-100 bg-red-50"
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
              !hasFairValue ? "text-slate-300" : undervalued ? "text-emerald-700" : "text-red-500"
            }`}
          >
            {hasFairValue ? `$${fmt2(result.fairValue)}` : "—"}
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
                !hasFairValue ? "bg-white" : undervalued ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              <span
                className={`text-[11px] font-bold ${
                  !hasFairValue ? "text-slate-500" : undervalued ? "text-emerald-700" : "text-red-600"
                }`}
              >
                Margin of safety
              </span>
              <span
                className={`font-mono text-[14px] font-bold tabular-nums ${
                  !hasFairValue ? "text-slate-300" : undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {hasFairValue ? fmtSigned(result.mos) : "—"}
              </span>
            </div>
          </div>
          {hasFairValue ? (
            <p
              className={`mt-2 text-[11px] leading-snug font-semibold ${
                undervalued ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {undervalued
                ? `Price sits ${fmt1(result.mos)}% below your fair value`
                : `Price sits ${fmt1(Math.abs(result.mos))}% above your fair value`}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={actions.onSetFairValue}
        disabled={actions.saving || !hasFairValue || result.fairValue <= 0}
        className="rounded-[9px] bg-emerald-600 py-2.5 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {actions.saving ? "Saving…" : "Set as My Fair Value"}
      </button>
    </div>
  );
}

function PegRightRail({
  assumptions,
  result,
  currentPrice,
  hasFairValue,
  myFairValue,
  actions,
  onField,
}: {
  assumptions: PeInputs;
  result: ReturnType<typeof valuePe>;
  currentPrice: number;
  hasFairValue: boolean;
  myFairValue: number | null;
  actions: MethodViewProps["actions"];
  onField: <K extends keyof PeInputs>(key: K, value: PeInputs[K]) => void;
}) {
  const undervalued = hasFairValue && result.mos >= 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-1">
        <Card className="px-3.5 py-3.5 md:px-[18px] md:py-4">
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

        <div
          className={`rounded-[14px] border px-3.5 py-3.5 md:px-[18px] md:py-4 ${
            !hasFairValue
              ? "border-slate-100 bg-slate-50"
              : undervalued
                ? "border-emerald-100 bg-emerald-50"
                : "border-red-100 bg-red-50"
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
              !hasFairValue ? "text-slate-300" : undervalued ? "text-emerald-700" : "text-red-500"
            }`}
          >
            {hasFairValue ? `$${fmt2(result.fairValue)}` : "—"}
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
                !hasFairValue ? "bg-white" : undervalued ? "bg-emerald-100" : "bg-red-100"
              }`}
            >
              <span
                className={`text-[11px] font-bold ${
                  !hasFairValue ? "text-slate-500" : undervalued ? "text-emerald-700" : "text-red-600"
                }`}
              >
                Margin of safety
              </span>
              <span
                className={`font-mono text-[14px] font-bold tabular-nums ${
                  !hasFairValue ? "text-slate-300" : undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {hasFairValue ? fmtSigned(result.mos) : "—"}
              </span>
            </div>
          </div>
          {hasFairValue ? (
            <p
              className={`mt-2 text-[11px] leading-snug font-semibold ${
                undervalued ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {undervalued
                ? `Price sits ${fmt1(result.mos)}% below your fair value`
                : `Price sits ${fmt1(Math.abs(result.mos))}% above your fair value`}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={actions.onSetFairValue}
        disabled={actions.saving || !hasFairValue || result.fairValue <= 0}
        className="rounded-[9px] bg-emerald-600 py-2.5 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {actions.saving ? "Saving…" : "Set as My Fair Value"}
      </button>
    </div>
  );
}

function EvRightRail({
  assumptions,
  result,
  currentPrice,
  avg5Y,
  myFairValue,
  actions,
  onField,
}: {
  assumptions: EvEbitdaInputs;
  result: ReturnType<typeof valueEvEbitda>;
  currentPrice: number;
  avg5Y: number | null;
  myFairValue: number | null;
  actions: MethodViewProps["actions"];
  onField: <K extends keyof EvEbitdaInputs>(key: K, value: EvEbitdaInputs[K]) => void;
}) {
  const undervalued = result.mos >= 0;
  const netDebt = assumptions.debt - assumptions.cash;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-1">
        <Card className="px-3.5 py-3.5 md:px-[18px] md:py-4">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold text-slate-900">Expected EV/EBITDA</p>
              <p className="mt-px text-[10px] text-slate-400">Your judgment multiple</p>
            </div>
            {avg5Y != null && (
              <button
                type="button"
                onClick={() => onField("expectedEvEbitda", Math.round(avg5Y * 10) / 10)}
                className="shrink-0 rounded-md border border-dashed border-slate-200 px-[7px] py-1 text-[10px] font-semibold text-slate-400 hover:border-blue-400 hover:text-blue-600"
              >
                5Y avg
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-[10px] border-2 border-slate-200 bg-white px-3.5 py-2 focus-within:border-blue-400">
            <NumberInput
              value={assumptions.expectedEvEbitda}
              limits={EXPECTED_EV_EBITDA_LIMITS}
              onCommit={(value) => onField("expectedEvEbitda", value)}
              ariaLabel="Expected EV/EBITDA"
              className="min-w-0 flex-1 text-[32px] font-bold text-slate-900"
            />
            <span className="text-[18px] font-semibold text-slate-400">×</span>
          </div>

          <div className="mt-2.5 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 rounded-[7px] border border-slate-100 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">TTM EBITDA</span>
              <span className="font-mono text-[13px] font-bold text-slate-800 tabular-nums">
                {fmtMoneyM(assumptions.ttmEbitda)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[7px] border border-slate-100 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">Net debt</span>
              <span className="font-mono text-[13px] font-bold text-slate-800 tabular-nums">
                {fmtMoneyM(netDebt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[7px] border border-slate-100 bg-slate-50 px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">Diluted shares</span>
              <span className="font-mono text-[13px] font-bold text-slate-800 tabular-nums">
                {(assumptions.shares ?? 0).toLocaleString()}M
              </span>
            </div>
            <p className="mt-1 text-center text-[10px] leading-snug text-slate-400">
              FV = ({assumptions.expectedEvEbitda}× × EBITDA − debt + cash) / shares
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
            <div className="flex items-center justify-between rounded-[7px] bg-white px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">Current EV/EBITDA</span>
              <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">
                {result.currentMultiple == null ? "—" : `${fmt1(result.currentMultiple)}×`}
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
  lens,
  peers,
  loading,
  onRemove,
  onUseMultiple,
  quickFills,
}: {
  lens: MultiplesLens;
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
          {lens === "evebitda"
            ? "Live EV ÷ TTM EBITDA for peers already on the chart. 无倍数的标的会置灰，点击可看原因。"
            : "Live price ÷ EPS for peers already on the chart. 无 P/E 的标的会置灰，点击可看原因。"}
        </p>
      </div>

      {peers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[360px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {(lens === "evebitda" ? ["Ticker", "Price", "EV/EBITDA", ""] : ["Ticker", "Price", "P/E", "PEG", ""]).map((heading) => (
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
                const unavailable =
                  lens === "evebitda"
                    ? peer.evEbitda == null && peer.evEbitdaUnavailableReason != null
                    : peer.pe == null && peer.peUnavailableReason != null;
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
                          {loading &&
                            peer.price == null &&
                            (lens === "evebitda" ? peer.evEbitda == null : peer.pe == null) &&
                            !unavailable && (
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
                          {lens === "evebitda"
                            ? peer.evEbitda == null
                              ? "—"
                              : `${fmt1(peer.evEbitda)}×`
                            : peer.pe == null
                              ? "—"
                              : `${fmt1(peer.pe)}×`}
                        </span>
                      </td>
                      {lens !== "evebitda" && (
                        <td className="px-3 py-[7px]">
                          <span
                            className={`font-mono text-[12px] tabular-nums ${
                              unavailable ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            {peer.peg == null ? "—" : fmt2(peer.peg)}
                          </span>
                        </td>
                      )}
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
                    {open &&
                      (lens === "evebitda"
                        ? peer.evEbitdaUnavailableReason
                        : peer.peUnavailableReason) != null && (
                      <tr className="border-b border-slate-50 bg-slate-50">
                        <td colSpan={lens === "evebitda" ? 4 : 5} className="px-3 py-2">
                          <p className="text-[11px] leading-snug text-slate-500">
                            {lens === "evebitda"
                              ? peer.evEbitdaUnavailableReason
                              : peer.peUnavailableReason}
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
          <span className="text-[10px] text-slate-400">
            {lens === "evebitda" ? "Set expected EV/EBITDA →" : "Set expected P/E →"}
          </span>
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
