"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  EXPECTED_GROWTH_LIMITS,
  EXPECTED_PE_LIMITS,
  median,
  trailingAveragePe,
  valuePe,
  type PeerMultiple,
  type PeInputs,
} from "@mystockjournal/shared";
import { api } from "@/lib/api";
import type { MethodViewProps } from "./actions";
import { PEER_COLORS, PeChart, type PeChartMode } from "./pe-chart";
import { Card, CardHeader, NumberInput, fmt1, fmt2, fmtSigned } from "./primitives";

const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]{0,15}$/;
const MAX_PEERS = 8;

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
  const [peerTickers, setPeerTickers] = useState<string[]>([]);

  const result = useMemo(() => valuePe(assumptions, currentPrice), [assumptions, currentPrice]);
  const avg5Y = useMemo(() => trailingAveragePe(anchors.peHistory, 5), [anchors.peHistory]);
  const avg10Y = useMemo(() => trailingAveragePe(anchors.peHistory, 10), [anchors.peHistory]);

  const peersQuery = useQuery({
    queryKey: ["valuation-peers", ticker, peerTickers],
    queryFn: () =>
      api<{ peers: PeerMultiple[] }>(
        `/stocks/${ticker}/valuation/pe/peers?tickers=${peerTickers.join(",")}`,
      ),
    enabled: peerTickers.length > 0,
  });
  const peers = peerTickers.length > 0 ? (peersQuery.data?.peers ?? []) : [];

  function setField<K extends keyof PeInputs>(key: K, value: PeInputs[K]) {
    onChange({ ...assumptions, [key]: value });
  }

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
              chartMode === "pe" ? "10-year P/E vs. references" : "10-year PEG vs. growth and peers"
            }
            subtitle={`${ticker} · ${peers.length > 0 ? `${peers.length} peer${peers.length > 1 ? "s" : ""} plotted` : "no peers added"}`}
            right={
              <div className="flex shrink-0 items-center rounded-lg bg-slate-100 p-[3px]">
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
            }
          />

          <div className="px-2 py-3">
            <PeChart
              mode={chartMode}
              history={anchors.peHistory}
              expectedPe={assumptions.expectedPe}
              expectedGrowth={assumptions.expectedGrowth}
              avg5Y={avg5Y}
              avg10Y={avg10Y}
              peers={peers}
              label={ticker}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 px-4 pb-3 md:gap-4 md:px-5">
            {chartMode === "pe" ? (
              <>
                <Legend color="bg-emerald-500" label={`Expected ${assumptions.expectedPe}×`} solid />
                {avg5Y != null && <Legend color="bg-slate-400" label={`5Y avg ${fmt1(avg5Y)}×`} />}
                {avg10Y != null && <Legend color="bg-slate-300" label={`10Y avg ${fmt1(avg10Y)}×`} />}
              </>
            ) : (
              <>
                <Legend color="bg-amber-400" label="PEG = 1 (growth-fair)" />
                <Legend color="bg-emerald-500" label="PEG at your expected P/E" solid />
              </>
            )}
          </div>
        </Card>

        <PeerSection
          mode={chartMode}
          peers={peers}
          peerTickers={peerTickers}
          loading={peersQuery.isFetching}
          error={peersQuery.error instanceof Error ? peersQuery.error.message : null}
          selfTicker={ticker}
          onAdd={(peer) => setPeerTickers((prev) => [...prev, peer].slice(0, MAX_PEERS))}
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

function Legend({ color, label, solid = false }: { color: string; label: string; solid?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 ${solid ? "h-0.5" : "h-px"} ${color}`} />
      <span className="text-[10px] text-slate-500">{label}</span>
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

      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
        <button
          type="button"
          onClick={actions.onSetFairValue}
          disabled={actions.saving || result.fairValue <= 0}
          className="rounded-[9px] bg-emerald-600 py-2.5 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {actions.saving ? "Saving…" : "Set as My Fair Value"}
        </button>
        <button
          type="button"
          onClick={actions.onUseInDecision}
          disabled={actions.handingOff || result.fairValue <= 0}
          className={`rounded-[9px] py-2.5 text-[12px] font-bold disabled:opacity-60 ${
            actions.handingOff ? "bg-blue-100 text-blue-700" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {actions.handingOff ? "Returning…" : "Use in decision"}
        </button>
      </div>
    </div>
  );
}

function PeerSection({
  mode,
  peers,
  peerTickers,
  loading,
  error,
  selfTicker,
  onAdd,
  onRemove,
  onUseMultiple,
  quickFills,
}: {
  mode: PeChartMode;
  peers: PeerMultiple[];
  peerTickers: string[];
  loading: boolean;
  error: string | null;
  selfTicker: string;
  onAdd: (ticker: string) => void;
  onRemove: (ticker: string) => void;
  onUseMultiple: (value: number) => void;
  quickFills: { label: string; value: number }[];
}) {
  const [draft, setDraft] = useState("");

  const peerMedianPe = median(peers.map((p) => p.pe).filter((v): v is number => v != null));
  const peerMedianPeg = median(peers.map((p) => p.peg).filter((v): v is number => v != null));

  const candidate = draft.trim().toUpperCase();
  const canAdd =
    TICKER_RE.test(candidate) &&
    candidate !== selfTicker &&
    !peerTickers.includes(candidate) &&
    peerTickers.length < MAX_PEERS;

  function submit() {
    if (!canAdd) return;
    onAdd(candidate);
    setDraft("");
  }

  return (
    <Card className="px-4 py-4 md:px-5">
      <div className="mb-3">
        <p className="text-[13px] font-bold text-slate-900">Peers for comparison</p>
        <p className="mt-px text-[11px] text-slate-400">
          Added peers appear on the chart. Multiples use each peer&apos;s live price and latest EPS.
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
              {peers.map((peer, index) => (
                <tr key={peer.ticker} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-[7px]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-[7px] shrink-0 rounded-full"
                        style={{ backgroundColor: PEER_COLORS[index % PEER_COLORS.length] }}
                      />
                      <span className="font-mono text-[12px] font-bold text-slate-800">
                        {peer.ticker}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-[7px]">
                    <span className="font-mono text-[12px] text-slate-500 tabular-nums">
                      {peer.price == null ? "—" : `$${fmt2(peer.price)}`}
                    </span>
                  </td>
                  <td className="px-3 py-[7px]">
                    <span className="font-mono text-[12px] font-semibold text-slate-700 tabular-nums">
                      {peer.pe == null ? "no EPS" : `${fmt1(peer.pe)}×`}
                    </span>
                  </td>
                  <td className="px-3 py-[7px]">
                    <span className="font-mono text-[12px] text-slate-500 tabular-nums">
                      {peer.peg == null ? "—" : fmt2(peer.peg)}
                    </span>
                  </td>
                  <td className="px-3 py-[7px] text-right">
                    <button
                      type="button"
                      onClick={() => onRemove(peer.ticker)}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {(peerMedianPe != null || peerMedianPeg != null) && (
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-3 py-[7px]">
                    <span className="text-[11px] font-bold text-slate-600">Peer median</span>
                  </td>
                  <td className="px-3 py-[7px]" />
                  <td className="px-3 py-[7px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-slate-800 tabular-nums">
                        {peerMedianPe == null ? "—" : `${fmt1(peerMedianPe)}×`}
                      </span>
                      {peerMedianPe != null && mode === "pe" && (
                        <button
                          type="button"
                          onClick={() => onUseMultiple(peerMedianPe)}
                          className="rounded-[5px] border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500 hover:text-blue-700"
                        >
                          Use
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-[7px]">
                    <span className="font-mono text-[12px] font-semibold text-slate-600 tabular-nums">
                      {peerMedianPeg == null ? "—" : fmt2(peerMedianPeg)}
                    </span>
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {quickFills.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Quick fill →</span>
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

      <form
        className="mt-3 flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value.toUpperCase())}
          placeholder={peerTickers.length >= MAX_PEERS ? `Up to ${MAX_PEERS} peers` : "Add a ticker…"}
          maxLength={16}
          disabled={peerTickers.length >= MAX_PEERS}
          className="flex-1 rounded-[7px] border border-slate-200 px-2.5 py-1.5 font-mono text-[12px] text-slate-800 outline-none placeholder:font-sans placeholder:text-slate-300 focus:border-blue-400 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!canAdd}
          className="rounded-[7px] bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Add"}
        </button>
      </form>

      {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
      {peers.length === 0 && !loading && !error && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          A multiple only means something in context. Add a competitor to see how the market prices
          it.
        </p>
      )}
    </Card>
  );
}
