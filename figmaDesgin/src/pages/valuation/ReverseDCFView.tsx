import { useState, useMemo } from "react";
import { useRouter } from "../../router";

// ─── Shared constants (DDOG) ──────────────────────────────────────────────────

const CURRENT_PRICE = 248.0;

interface HeldConstants {
  wacc: number;
  termGrowth: number;
  fcfMarginY1: number;
  fcfMarginTerm: number;
  growthY6_10: number; // rule-based; not the solved variable
}

interface Anchors {
  ttmRevenue: number;
  cash: number;
  debt: number;
  shares: number;
  past5YCAGR: number;
}

const DEFAULT_ANCHORS: Anchors = {
  ttmRevenue: 3966.7,
  cash: 3200,
  debt: 800,
  shares: 325,
  past5YCAGR: 39.2,
};

// User's DCF base assumptions (for comparison)
const MY_DCF_BASE = {
  growthY1_5:  20.0,
  growthY6_10: 12.0,
  wacc:        9.0,
  termGrowth:  4.0,
  fcfMarginY1: 25.0,
  fcfMarginTerm: 33.0,
};

const DEFAULT_HELD: HeldConstants = {
  wacc:           9.0,
  termGrowth:     4.0,
  fcfMarginY1:    25.0,
  fcfMarginTerm:  33.0,
  growthY6_10:    12.0,
};

// ─── Math ─────────────────────────────────────────────────────────────────────

function computeEV(
  ttmRevenue: number,
  growthY1_5: number,
  held: HeldConstants,
): number {
  let rev = ttmRevenue;
  const fade = (held.fcfMarginTerm - held.fcfMarginY1) / 9;
  let pvFcfs = 0;
  let lastFcf = 0;
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? growthY1_5 : held.growthY6_10;
    rev = rev * (1 + g / 100);
    const margin = held.fcfMarginY1 + fade * (i - 1);
    const fcf = (rev * margin) / 100;
    pvFcfs += fcf / Math.pow(1 + held.wacc / 100, i);
    if (i === 10) lastFcf = fcf;
  }
  const tv  = (lastFcf * (1 + held.termGrowth / 100)) / ((held.wacc - held.termGrowth) / 100);
  const pvTv = tv / Math.pow(1 + held.wacc / 100, 10);
  return pvFcfs + pvTv;
}

function solveImpliedGrowth(anchors: Anchors, held: HeldConstants, price: number): number {
  const targetEquity = price * anchors.shares;
  const targetEV     = targetEquity - anchors.cash + anchors.debt;

  let lo = -20, hi = 150, mid = 0;
  for (let iter = 0; iter < 80; iter++) {
    mid = (lo + hi) / 2;
    const ev = computeEV(anchors.ttmRevenue, mid, held);
    if (ev < targetEV) lo = mid; else hi = mid;
    if (Math.abs(hi - lo) < 0.001) break;
  }
  return mid;
}

interface YearRow {
  year: number; revenue: number; growth: number;
  fcfMargin: number; fcf: number; pvFcf: number;
  isTerminal?: boolean;
}

function buildImpliedRows(anchors: Anchors, held: HeldConstants, impliedGrowth: number): {
  rows: YearRow[]; pvFcfs: number; tv: number; pvTv: number; ev: number;
} {
  let rev = anchors.ttmRevenue;
  const fade = (held.fcfMarginTerm - held.fcfMarginY1) / 9;
  const rows: YearRow[] = [];
  let pvFcfs = 0;
  let lastFcf = 0;
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? impliedGrowth : held.growthY6_10;
    rev = rev * (1 + g / 100);
    const margin = held.fcfMarginY1 + fade * (i - 1);
    const fcf = (rev * margin) / 100;
    const pvFcf = fcf / Math.pow(1 + held.wacc / 100, i);
    pvFcfs += pvFcf;
    if (i === 10) lastFcf = fcf;
    rows.push({ year: 2025 + i, revenue: rev, growth: g, fcfMargin: margin, fcf, pvFcf, isTerminal: i === 10 });
  }
  const tv  = (lastFcf * (1 + held.termGrowth / 100)) / ((held.wacc - held.termGrowth) / 100);
  const pvTv = tv / Math.pow(1 + held.wacc / 100, 10);
  const ev  = pvFcfs + pvTv;
  return { rows, pvFcfs, tv, pvTv, ev };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt0  = (v: number) => `$${Math.round(v).toLocaleString()}M`;
const fmt2  = (v: number) => `$${v.toFixed(2)}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ implied, held, anchors }: {
  implied: number; held: HeldConstants; anchors: Anchors;
}) {
  const targetEquity = CURRENT_PRICE * anchors.shares;
  const targetEV     = targetEquity - anchors.cash + anchors.debt;
  const impliedY6_10 = held.growthY6_10;
  const faster = implied > MY_DCF_BASE.growthY1_5;

  return (
    <div className="bg-white rounded-[16px] border border-slate-100 overflow-hidden">
      {/* Top label */}
      <div className="bg-slate-900 px-[24px] py-[10px] flex items-center gap-[10px]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="#64748b" strokeWidth="1.2" />
          <path d="M7 4.5v3l2 1.2" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          What is the market pricing in?
        </span>
      </div>

      <div className="px-[24px] py-[20px]">
        <div className="flex items-start gap-[32px]">
          {/* Current price */}
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-[4px]">
              Current price
            </p>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className="text-[32px] font-bold text-slate-800 tabular-nums">
              ${CURRENT_PRICE}
            </span>
          </div>

          <div className="text-slate-200 text-[28px] mt-[18px] select-none">→</div>

          {/* Implied CAGR — hero number */}
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-[4px]">
              Implied revenue CAGR · Y1–5
            </p>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className={`text-[56px] font-bold tabular-nums leading-none ${faster ? "text-amber-500" : "text-blue-600"}`}>
              {fmtPct(implied)}
            </span>
          </div>

          {/* Secondary implied metrics */}
          <div className="ml-auto flex flex-col gap-[10px] pt-[4px]">
            <div className="rounded-[10px] bg-slate-50 border border-slate-100 px-[16px] py-[10px]">
              <p style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-[3px]">Y6–10 rule (held)</p>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className="text-[18px] font-bold text-slate-700 tabular-nums">
                {fmtPct(impliedY6_10)}
              </span>
            </div>
            <div className="rounded-[10px] bg-slate-50 border border-slate-100 px-[16px] py-[10px]">
              <p style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-[3px]">Target EV</p>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className="text-[18px] font-bold text-slate-700 tabular-nums">
                {fmt0(targetEV)}
              </span>
            </div>
          </div>
        </div>

        {/* Narrative sentence */}
        <div className={`mt-[16px] rounded-[10px] px-[16px] py-[10px] border ${faster ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className={`text-[13px] leading-relaxed ${faster ? "text-amber-800" : "text-blue-800"}`}>
            At <strong>${CURRENT_PRICE}</strong>, the market is implying approximately{" "}
            <strong>{fmtPct(implied)}</strong> revenue growth over the next 5 years — given your
            held-constant FCF margins ({fmtPct(held.fcfMarginY1)}→{fmtPct(held.fcfMarginTerm)}),
            WACC {fmtPct(held.wacc)}, and terminal growth {fmtPct(held.termGrowth)}.
            {faster
              ? " That is faster than your DCF base assumption."
              : " That is slower than your DCF base assumption."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Comparison strip ─────────────────────────────────────────────────────────

function ComparisonStrip({
  implied, held, onOpenDCF,
}: {
  implied: number;
  held: HeldConstants;
  onOpenDCF: () => void;
}) {
  const faster = implied > MY_DCF_BASE.growthY1_5;

  const rows: { label: string; market: string; yours: string; held?: boolean }[] = [
    { label: "Revenue CAGR Y1–5", market: fmtPct(implied), yours: fmtPct(MY_DCF_BASE.growthY1_5) },
    { label: "Revenue Growth Y6–10", market: `${fmtPct(held.growthY6_10)} (rule)`, yours: fmtPct(MY_DCF_BASE.growthY6_10), held: true },
    { label: "FCF Margin Y1", market: `${fmtPct(held.fcfMarginY1)} (held)`, yours: fmtPct(MY_DCF_BASE.fcfMarginY1), held: true },
    { label: "FCF Margin Terminal", market: `${fmtPct(held.fcfMarginTerm)} (held)`, yours: fmtPct(MY_DCF_BASE.fcfMarginTerm), held: true },
    { label: "WACC", market: `${fmtPct(held.wacc)} (held)`, yours: fmtPct(MY_DCF_BASE.wacc), held: true },
    { label: "Terminal growth", market: `${fmtPct(held.termGrowth)} (held)`, yours: fmtPct(MY_DCF_BASE.termGrowth), held: true },
  ];

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-[20px] py-[14px] border-b border-slate-100 flex items-center justify-between">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[13px] font-bold text-slate-900">Market-implied vs My DCF base</p>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[11px] text-slate-400 mt-[2px]">Only growth differs — all other inputs are held constant</p>
        </div>
        <div className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] ${faster ? "bg-amber-50" : "bg-blue-50"}`}>
          <div className={`size-[6px] rounded-full ${faster ? "bg-amber-400" : "bg-blue-400"}`} />
          <span style={{ fontFamily: "'Inter', sans-serif" }}
            className={`text-[11px] font-semibold ${faster ? "text-amber-700" : "text-blue-700"}`}>
            {faster
              ? "Market implies faster growth than your base"
              : "Market implies slower growth than your base"}
          </span>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            {["", "Market-implied", "My DCF base"].map((h, i) => (
              <th key={i} className="px-[20px] py-[8px] text-left">
                <span style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isGrowthRow = i === 0;
            return (
              <tr key={r.label} className="border-t border-slate-50 hover:bg-slate-50/50">
                <td className="px-[20px] py-[9px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }}
                    className={`text-[12px] ${isGrowthRow ? "font-bold text-slate-800" : "text-slate-500"}`}>
                    {r.label}
                  </span>
                </td>
                <td className="px-[20px] py-[9px]">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className={`text-[12px] font-semibold tabular-nums ${
                      isGrowthRow
                        ? faster ? "text-amber-500" : "text-blue-600"
                        : r.held ? "text-slate-400" : "text-slate-700"}`}>
                    {r.market}
                  </span>
                </td>
                <td className="px-[20px] py-[9px]">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className={`text-[12px] font-semibold tabular-nums ${isGrowthRow ? "text-slate-800" : "text-slate-400"}`}>
                    {r.yours}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* CTAs */}
      <div className="px-[20px] py-[12px] border-t border-slate-100 flex items-center gap-[8px]">
        <button onClick={onOpenDCF}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="flex items-center gap-[5px] px-[12px] py-[6px] rounded-[7px] text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white border-0 cursor-pointer transition-colors">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 8l6-6M8 8V2H2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Edit my assumptions in DCF
        </button>
        <button
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="flex items-center gap-[5px] px-[12px] py-[6px] rounded-[7px] text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer transition-colors">
          Apply held-constants to DCF
        </button>
      </div>
    </div>
  );
}

// ─── Held-constant inputs ─────────────────────────────────────────────────────

function HeldConstantsSection({
  anchors, held, onHeld, anchorsUnlocked, onToggleAnchors,
}: {
  anchors: Anchors; held: HeldConstants;
  onHeld: (k: keyof HeldConstants, v: number) => void;
  anchorsUnlocked: boolean; onToggleAnchors: () => void;
}) {
  const anchorFields: { label: string; value: string; note?: string }[] = [
    { label: "TTM Revenue",         value: `$${anchors.ttmRevenue.toLocaleString()}M` },
    { label: "Cash & Investments",  value: `$${anchors.cash.toLocaleString()}M` },
    { label: "Total Debt",          value: `$${anchors.debt.toLocaleString()}M` },
    { label: "Diluted Shares",      value: `${anchors.shares}M` },
    { label: "Current Market Price",value: `$${CURRENT_PRICE}`, note: "Locked — reverse-solve source" },
    { label: "Past 5Y Rev CAGR",    value: fmtPct(anchors.past5YCAGR), note: "Reference only · not used in model" },
  ];

  const driverFields: { label: string; key: keyof HeldConstants; step: number; pct?: boolean }[] = [
    { label: "WACC (discount rate)",      key: "wacc",          step: 0.5, pct: true },
    { label: "Terminal Growth (g)",       key: "termGrowth",    step: 0.5, pct: true },
    { label: "FCF Margin Y1",             key: "fcfMarginY1",   step: 0.5, pct: true },
    { label: "FCF Margin Terminal",       key: "fcfMarginTerm", step: 0.5, pct: true },
    { label: "Revenue Growth Y6–10 (rule)", key: "growthY6_10", step: 0.5, pct: true },
  ];

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      <div className="px-[20px] py-[14px] border-b border-slate-100">
        <p style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[13px] font-bold text-slate-900">Held-constant inputs</p>
        <p style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[11px] text-slate-400 mt-[1px]">Changing these updates the implied growth needed to justify the current price</p>
      </div>

      <div className="p-[20px] flex gap-[16px]">
        {/* Anchors */}
        <div className="flex-1 rounded-[10px] bg-slate-50 border border-slate-100 p-[14px]">
          <div className="flex items-center justify-between mb-[10px]">
            <div>
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Anchors
              </span>
              <p style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[10px] text-slate-400 mt-[1px]">Prefetched · override only if needed</p>
            </div>
            <button onClick={onToggleAnchors}
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="flex items-center gap-[4px] text-[10px] font-semibold text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 rounded-[5px] px-[8px] py-[3px] bg-transparent cursor-pointer transition-colors">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <rect x="1" y="4" width="7" height="4.5" rx="1" stroke="currentColor" strokeWidth="1" />
                <path d={anchorsUnlocked ? "M2.5 4V3a2 2 0 0 1 4 0v1" : "M2.5 4V3a2 2 0 0 1 4 0v1"}
                  stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              {anchorsUnlocked ? "Lock" : "Unlock"}
            </button>
          </div>
          <div className="flex flex-col gap-[6px]">
            {anchorFields.map(f => (
              <div key={f.label} className="flex items-center justify-between">
                <div>
                  <span style={{ fontFamily: "'Inter', sans-serif" }}
                    className="text-[11px] text-slate-500">{f.label}</span>
                  {f.note && (
                    <p style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[9px] text-slate-400 leading-tight">{f.note}</p>
                  )}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-[12px] font-semibold text-slate-600 tabular-nums">{f.value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[10px] text-slate-400 mt-[10px] pt-[8px] border-t border-slate-200 leading-snug italic">
            Cash and debt are not part of yearly FCF. They convert EV into equity value.
          </p>
        </div>

        {/* Held drivers */}
        <div className="flex-1 rounded-[10px] bg-white border border-blue-100 p-[14px]">
          <div className="mb-[10px]">
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
              Held-constant drivers
            </span>
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] text-blue-400 mt-[1px]">Edit to see how implied growth changes</p>
          </div>
          <div className="flex flex-col gap-[8px]">
            {driverFields.map(f => (
              <div key={f.key} className="flex items-center justify-between gap-[12px]">
                <label style={{ fontFamily: "'Inter', sans-serif" }}
                  className="text-[11px] text-slate-600 flex-1">{f.label}</label>
                <div className="flex items-center gap-[4px] rounded-[7px] border border-slate-200 focus-within:border-blue-300 px-[8px] py-[4px] bg-white">
                  <input
                    type="number" value={held[f.key]} step={f.step} min={0}
                    onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onHeld(f.key, v); }}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="w-[48px] text-[12px] font-bold text-slate-900 tabular-nums bg-transparent border-0 outline-none text-right p-0" />
                  {f.pct && (
                    <span style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[10px] text-slate-400">%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Market bridge (compact) ──────────────────────────────────────────────────

function MarketBridgeSection({ anchors, ev, pvFcfs, pvTv }: {
  anchors: Anchors; ev: number; pvFcfs: number; pvTv: number;
}) {
  const marketCap   = CURRENT_PRICE * anchors.shares;
  const targetEV    = marketCap - anchors.cash + anchors.debt;
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      <div className="px-[20px] py-[14px] border-b border-slate-100 flex items-center justify-between">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[13px] font-bold text-slate-900">Market-price bridge</p>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[11px] text-slate-400 mt-[1px]">
            How current price maps to implied EV
          </p>
        </div>
      </div>

      <div className="px-[24px] py-[16px]">
        {/* Main chain */}
        {[
          { label: "Current Price", val: `$${CURRENT_PRICE}`, sub: `× ${anchors.shares}M shares` },
          { label: "= Market Cap", val: fmt0(marketCap), indent: false },
          { label: "− Cash & Investments", val: `(${fmt0(anchors.cash)})`, negative: true },
          { label: "+ Total Debt", val: fmt0(anchors.debt) },
          { label: "= Target EV", val: fmt0(targetEV), strong: true },
        ].map((r, i) => (
          <div key={i}
            className={`flex items-center justify-between py-[6px] ${i > 0 ? "border-t border-slate-50" : ""} ${r.strong ? "border-t-2 border-slate-200 mt-[2px] pt-[8px]" : ""}`}>
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className={`text-[12px] ${r.strong ? "font-bold text-slate-900" : "text-slate-500"}`}>
              {r.label}
              {r.sub && <span className="text-[10px] text-slate-400 ml-[6px]">{r.sub}</span>}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className={`text-[12px] font-semibold tabular-nums ${r.strong ? "text-slate-900 text-[14px] font-bold" : r.negative ? "text-red-500" : "text-slate-700"}`}>
              {r.val}
            </span>
          </div>
        ))}

        {/* Expandable: EV breakdown */}
        <button onClick={() => setOpen(o => !o)}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="w-full flex items-center gap-[6px] mt-[8px] pt-[8px] border-t border-dashed border-slate-200 text-[11px] font-semibold text-slate-400 hover:text-blue-600 bg-transparent border-l-0 border-r-0 border-b-0 cursor-pointer transition-colors px-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {open ? "Hide EV breakdown" : "Show EV breakdown (PV FCFs + PV TV)"}
        </button>

        {open && (
          <div className="mt-[8px] flex flex-col gap-[4px] pl-[12px]">
            {[
              { label: "PV of projected FCFs (Y1–10)", val: fmt0(pvFcfs), pct: pvFcfs / ev * 100 },
              { label: "PV of Terminal Value", val: fmt0(pvTv), pct: pvTv / ev * 100, highlight: true },
            ].map((r, i) => (
              <div key={i}
                className={`flex items-center justify-between px-[12px] py-[7px] rounded-[8px] ${r.highlight ? "bg-slate-50 border border-slate-100" : ""}`}>
                <div>
                  <span style={{ fontFamily: "'Inter', sans-serif" }}
                    className="text-[11px] text-slate-600">{r.label}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif" }}
                    className="text-[10px] text-slate-400">{r.pct.toFixed(1)}% of EV</p>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-[13px] font-semibold text-slate-700 tabular-nums">{r.val}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-[12px] py-[7px] border-t-2 border-slate-200 mt-[2px]">
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[12px] font-bold text-slate-800">= EV (implied)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className="text-[14px] font-bold text-slate-900 tabular-nums">{fmt0(ev)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Forecast (collapsed) ─────────────────────────────────────────────────────

function ForecastSection({ rows, tv }: { rows: YearRow[]; tv: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-[20px] py-[14px] border-b border-slate-100 cursor-pointer bg-transparent border-l-0 border-r-0 border-t-0 text-left hover:bg-slate-50/50 transition-colors">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[13px] font-bold text-slate-900">10-Year path under market-implied growth</p>
          <p style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[11px] text-slate-400 mt-[1px]">
            Terminal Value {fmt0(tv)} · Open to verify the year-by-year path behind EV
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M4 6l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Year", "Revenue $M", "Growth", "FCF Margin", "FCF $M", "Terminal Value"].map(h => (
                  <th key={h} className="px-[14px] py-[8px]">
                    <span style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year}
                  className={`border-b border-slate-50 ${r.isTerminal ? "bg-blue-50/40" : "hover:bg-slate-50/40"}`}>
                  <td className="px-[14px] py-[7px]">
                    <div className="flex items-center gap-[6px]">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        className="text-[12px] font-bold text-slate-800 tabular-nums">{r.year}</span>
                      {r.isTerminal && (
                        <span style={{ fontFamily: "'Inter', sans-serif" }}
                          className="text-[9px] font-bold text-blue-500 bg-blue-100 rounded-[4px] px-[5px] py-[1px]">
                          Terminal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-[14px] py-[7px]">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[12px] text-slate-700 tabular-nums">{Math.round(r.revenue).toLocaleString()}</span>
                  </td>
                  <td className="px-[14px] py-[7px]">
                    <div className="flex items-center gap-[4px]">
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        className="text-[12px] tabular-nums text-slate-600">{fmtPct(r.growth)}</span>
                      {i < 5 && (
                        <span style={{ fontFamily: "'Inter', sans-serif" }}
                          className="text-[9px] text-amber-500 font-semibold">(implied)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-[14px] py-[7px]">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[12px] text-slate-500 tabular-nums">{fmtPct(r.fcfMargin)}</span>
                  </td>
                  <td className="px-[14px] py-[7px]">
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[12px] font-semibold text-slate-700 tabular-nums">{Math.round(r.fcf).toLocaleString()}</span>
                  </td>
                  <td className="px-[14px] py-[7px]">
                    {r.isTerminal ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        className="text-[12px] font-bold text-blue-600 tabular-nums">{Math.round(tv).toLocaleString()}</span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── AI Challenge ─────────────────────────────────────────────────────────────

function AIChallenge({ implied, onOpenDCF }: { implied: number; onOpenDCF: () => void }) {
  const faster = implied > MY_DCF_BASE.growthY1_5;
  const diff   = Math.abs(implied - MY_DCF_BASE.growthY1_5);

  const challenges = faster ? [
    `Market-implied CAGR (${fmtPct(implied)}) is ${diff.toFixed(1)}pp faster than your base (${fmtPct(MY_DCF_BASE.growthY1_5)}). What would need to be true for DDOG to sustain this growth?`,
    "Consider: TAM expansion, competitive moat durability, or an AI-driven acceleration in cloud observability spend.",
    "Ask yourself: Is the implied path plausible, or is the market pricing in optimism you don't share?",
  ] : [
    `Market is underwriting a more cautious path (${fmtPct(implied)}) than your base (${fmtPct(MY_DCF_BASE.growthY1_5)}).`,
    "This could represent a margin of safety opportunity — or the market may be discounting risks in your model.",
    "Consider what evidence would confirm or refute your more bullish assumption before acting.",
  ];

  return (
    <div className="bg-white rounded-[14px] border border-amber-100 overflow-hidden">
      <div className="bg-amber-50 px-[20px] py-[12px] border-b border-amber-100 flex items-center gap-[8px]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2.5v5M7 9.5v1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="7" cy="7" r="5.5" stroke="#f59e0b" strokeWidth="1.2" />
        </svg>
        <span style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">AI Challenge</span>
        <span style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[10px] text-amber-500 ml-auto">Never Buy/Sell advice</span>
      </div>

      <div className="px-[20px] py-[16px] flex flex-col gap-[10px]">
        {challenges.map((c, i) => (
          <div key={i} className="flex gap-[10px]">
            <div className="size-[18px] rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-[1px]">
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className="text-[10px] font-bold text-amber-600">{i + 1}</span>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[12px] text-slate-700 leading-relaxed">{c}</p>
          </div>
        ))}

        <div className="flex items-center gap-[8px] mt-[4px] pt-[10px] border-t border-amber-100">
          <button
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-[7px] text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 8.5l3-7 1.5 3 2-1.5" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Write journal note
          </button>
          <button onClick={onOpenDCF}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-[7px] text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-colors">
            Open in DCF
          </button>
          <button
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="flex items-center gap-[5px] px-[10px] py-[6px] rounded-[7px] text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 cursor-pointer transition-colors">
            Review filings / peers
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export interface ReverseDCFViewProps {
  onSwitchToDCF: () => void;
  onUseInDecision: () => void;
  usedInDecision: boolean;
}

export default function ReverseDCFView({ onSwitchToDCF, onUseInDecision, usedInDecision }: ReverseDCFViewProps) {
  const [held, setHeld]               = useState<HeldConstants>(DEFAULT_HELD);
  const [anchors]                     = useState<Anchors>(DEFAULT_ANCHORS);
  const [anchorsUnlocked, setALocked] = useState(false);

  function onHeld(k: keyof HeldConstants, v: number) {
    setHeld(p => ({ ...p, [k]: v }));
  }

  const implied = useMemo(() => solveImpliedGrowth(anchors, held, CURRENT_PRICE), [anchors, held]);

  const { rows, pvFcfs, tv, pvTv, ev } = useMemo(
    () => buildImpliedRows(anchors, held, implied),
    [anchors, held, implied],
  );

  return (
    <div className="flex flex-col gap-[12px]">
      {/* 1 — Hero */}
      <HeroSection implied={implied} held={held} anchors={anchors} />

      {/* 2 — Comparison */}
      <ComparisonStrip implied={implied} held={held} onOpenDCF={onSwitchToDCF} />

      {/* 3 — Held-constant inputs */}
      <HeldConstantsSection
        anchors={anchors} held={held} onHeld={onHeld}
        anchorsUnlocked={anchorsUnlocked} onToggleAnchors={() => setALocked(v => !v)} />

      {/* 4 — Market bridge */}
      <MarketBridgeSection anchors={anchors} ev={ev} pvFcfs={pvFcfs} pvTv={pvTv} />

      {/* 5 — Forecast (collapsed) */}
      <ForecastSection rows={rows} tv={tv} />

      {/* 6 — AI Challenge */}
      <AIChallenge implied={implied} onOpenDCF={onSwitchToDCF} />

      {/* Use in decision */}
      <div className="flex justify-end gap-[8px] pb-[8px]">
        <button onClick={onSwitchToDCF}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="flex items-center gap-[5px] px-[14px] py-[8px] rounded-[9px] text-[12px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 cursor-pointer transition-colors">
          Open in DCF →
        </button>
        <button onClick={onUseInDecision}
          style={{ fontFamily: "'Inter', sans-serif" }}
          className={`px-[14px] py-[8px] rounded-[9px] text-[12px] font-bold border-0 cursor-pointer transition-colors ${
            usedInDecision ? "bg-blue-100 text-blue-700" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
          {usedInDecision ? "Returning to transaction…" : "Use in decision →"}
        </button>
      </div>
    </div>
  );
}
