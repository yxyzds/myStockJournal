import { useState, useMemo } from "react";
import { useRouter } from "../router";
import PEView from "./valuation/PEView";
import ReverseDCFView from "./valuation/ReverseDCFView";

// ─── Model ────────────────────────────────────────────────────────────────────

interface Inputs {
  ttmRevenue: number;
  growthY1_5: number;
  growthY6_10: number;
  termGrowth: number;
  wacc: number;
  fcfMarginY1: number;
  fcfMarginTerm: number;
  cash: number;
  debt: number;
  shares: number;
}

// DDOG — numbers reconcile: FV $218.18, Price $248, MOS −12.0%
const AI_INPUTS: Inputs = {
  ttmRevenue: 3966.7,
  growthY1_5: 20.0,
  growthY6_10: 12.0,
  termGrowth: 4.0,
  wacc: 9.0,
  fcfMarginY1: 25.0,
  fcfMarginTerm: 33.0,
  cash: 3200,
  debt: 800,
  shares: 325,
};

const SCENARIO_INPUTS: Record<"bear" | "base" | "bull", Inputs> = {
  bear: { ...AI_INPUTS, growthY1_5: 12.0, growthY6_10: 7.0,  termGrowth: 3.0, wacc: 11.0, fcfMarginY1: 21.0, fcfMarginTerm: 27.0 },
  base: AI_INPUTS,
  bull: { ...AI_INPUTS, growthY1_5: 28.0, growthY6_10: 16.0, termGrowth: 5.0, wacc: 7.5,  fcfMarginY1: 28.0, fcfMarginTerm: 39.0 },
};

const CURRENT_PRICE = 248.0;
const PAST_5Y_CAGR  = 39.2; // reference-only

interface YearRow {
  year: number; revenue: number; growthPct: number;
  fcfMargin: number; fcf: number; pvFcf: number;
}

function calcRows(inp: Inputs): YearRow[] {
  const rows: YearRow[] = [];
  let rev = inp.ttmRevenue;
  const fade = (inp.fcfMarginTerm - inp.fcfMarginY1) / 9;
  for (let i = 1; i <= 10; i++) {
    const g = i <= 5 ? inp.growthY1_5 : inp.growthY6_10;
    rev = rev * (1 + g / 100);
    const margin = inp.fcfMarginY1 + fade * (i - 1);
    const fcf = (rev * margin) / 100;
    const pv  = fcf / Math.pow(1 + inp.wacc / 100, i);
    rows.push({ year: 2025 + i, revenue: rev, growthPct: g, fcfMargin: margin, fcf, pvFcf: pv });
  }
  return rows;
}

interface Bridge {
  pvFcfs: number; tv: number; pvTv: number;
  ev: number; equity: number; fv: number; mos: number;
}

function calcBridge(inp: Inputs, rows: YearRow[]): Bridge {
  if (inp.wacc <= inp.termGrowth) return { pvFcfs:0, tv:0, pvTv:0, ev:0, equity:0, fv:0, mos:-100 };
  const pvFcfs   = rows.reduce((s, r) => s + r.pvFcf, 0);
  const lastFcf  = rows[rows.length - 1].fcf;
  const tv       = (lastFcf * (1 + inp.termGrowth / 100)) / ((inp.wacc - inp.termGrowth) / 100);
  const pvTv     = tv / Math.pow(1 + inp.wacc / 100, 10);
  const ev       = pvFcfs + pvTv;
  const equity   = ev + inp.cash - inp.debt;
  const fv       = equity / inp.shares;
  const mos      = ((fv - CURRENT_PRICE) / CURRENT_PRICE) * 100;
  return { pvFcfs, tv, pvTv, ev, equity, fv, mos };
}

const n0  = (v: number)  => `$${Math.round(v).toLocaleString()}M`;
const f1  = (v: number)  => v.toFixed(1);
const f2  = (v: number)  => v.toFixed(2);
const sgn = (v: number)  => v >= 0 ? "+" : "";

// ─── Driver input field ───────────────────────────────────────────────────────

function DriverField({
  label, value, ai, suffix, step, min, max, onChange,
}: {
  label: string; value: number; ai: number; suffix: string;
  step: number; min: number; max: number;
  onChange: (v: number) => void;
}) {
  const diff     = Math.abs(value - ai);
  const threshold = Math.max(Math.abs(ai * 0.12), 0.3);
  const diverges = diff > threshold;

  return (
    <div className="flex flex-col gap-[4px]">
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.07em]">{label}</span>
        <button style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[10px] text-blue-400 hover:text-blue-600 font-semibold border-0 bg-transparent cursor-pointer p-0 transition-colors">
          Why?
        </button>
      </div>
      <div className={`flex items-center gap-[3px] rounded-[7px] border px-[10px] py-[7px] transition-all
        ${diverges ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200 hover:border-blue-300 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100"}`}>
        <input type="number" value={value} step={step} min={min} max={max}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
          className="w-full bg-transparent border-0 outline-none text-[14px] font-bold tabular-nums p-0 text-slate-900"
          style={{ fontFamily: "'JetBrains Mono', monospace" }} />
        <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400 shrink-0 select-none">{suffix}</span>
      </div>
      <div className="flex items-center justify-between h-[14px]">
        {diverges ? (
          <>
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] text-amber-600 font-semibold">AI: {ai}{suffix}</span>
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-[5px] py-[1px] rounded-[4px]">↑ differs</span>
          </>
        ) : (
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-300">AI: {ai}{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ─── Anchor row (read-only by default) ───────────────────────────────────────

function AnchorRow({ label, value, unlocked, onUnlockChange }: {
  label: string; value: string; unlocked: boolean;
  onUnlockChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-[7px] border-b border-slate-100 last:border-0">
      <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className="text-[12px] font-semibold text-slate-600 tabular-nums">{value}</span>
    </div>
  );
}

// ─── Section: Results (top) ───────────────────────────────────────────────────

function ResultsSection({
  bridge, myFairValue, onSetFV, onUseInDecision, usedInDecision,
}: {
  bridge: Bridge; myFairValue: number | null;
  onSetFV: () => void; onUseInDecision: () => void; usedInDecision: boolean;
}) {
  const pos = bridge.mos >= 0;

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      {/* MOS statement */}
      <div className={`px-[22px] py-[11px] border-b flex items-center gap-[10px] ${pos ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
        <div className={`size-[7px] rounded-full shrink-0 ${pos ? "bg-emerald-500" : "bg-red-400"}`} />
        <p style={{ fontFamily: "'Inter', sans-serif" }}
          className={`text-[12px] font-semibold leading-snug ${pos ? "text-emerald-800" : "text-red-700"}`}>
          {pos
            ? `Price is ${f1(bridge.mos)}% below your fair value — ${f2(bridge.fv - CURRENT_PRICE)}/share implied margin`
            : `Price is ${f1(Math.abs(bridge.mos))}% above your fair value — no margin of safety at current price`}
        </p>
      </div>

      {/* Two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Fair Value */}
        <div className="px-[18px] md:px-[24px] py-[18px] md:py-[20px] flex flex-col gap-[10px] md:gap-[12px]">
          <div className="flex items-center justify-between flex-wrap gap-[6px]">
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Model Fair Value</span>
            {myFairValue !== null && (
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-[7px] py-[2px] rounded-[100px]">
                MFV set · ${f2(myFairValue)}
              </span>
            )}
          </div>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className={`text-[40px] md:text-[52px] font-bold tabular-nums leading-none block ${pos ? "text-emerald-600" : "text-red-500"}`}>
              ${f2(bridge.fv)}
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className={`text-[12px] font-semibold mt-[4px] block ${pos ? "text-emerald-600" : "text-red-500"}`}>
              {sgn(bridge.mos)}{f1(bridge.mos)}% vs. current price
            </span>
          </div>
          <button onClick={onSetFV}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="self-start px-[14px] py-[7px] rounded-[8px] text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer transition-colors">
            Set as My Fair Value
          </button>
        </div>

        {/* Market Price */}
        <div className="px-[18px] md:px-[24px] py-[18px] md:py-[20px] flex flex-col gap-[10px] md:gap-[12px]">
          <span style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Market Price</span>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className="text-[40px] md:text-[52px] font-bold tabular-nums leading-none block text-slate-700">
              ${CURRENT_PRICE.toFixed(2)}
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] text-slate-400 mt-[4px] block">
              DDOG · Aug 29, 2026
            </span>
          </div>
          <button onClick={onUseInDecision}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`self-start px-[14px] py-[7px] rounded-[8px] text-[11px] font-bold border-0 cursor-pointer transition-colors ${
              usedInDecision ? "bg-blue-100 text-blue-700" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {usedInDecision ? "Returning…" : "Use in decision →"}
          </button>
        </div>
      </div>

      {/* TV summary chips — horizontally scrollable on mobile */}
      <div className="flex items-center gap-[8px] px-[18px] md:px-[22px] py-[10px] border-t border-slate-100 bg-slate-50 overflow-x-auto">
        <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] font-semibold text-slate-400 shrink-0">Inputs →</span>
        {[
          { label: "TV (undiscounted)", value: n0(bridge.tv) },
          { label: "PV of Terminal Value", value: n0(bridge.pvTv) },
          { label: "TV as % of EV", value: `${f1((bridge.pvTv / bridge.ev) * 100)}%` },
          { label: "Sum PV FCFs", value: n0(bridge.pvFcfs) },
        ].map(chip => (
          <div key={chip.label} className="flex items-center gap-[5px] bg-white border border-slate-200 rounded-[6px] px-[9px] py-[4px] shrink-0">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 whitespace-nowrap">{chip.label}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] font-bold text-slate-700 tabular-nums">{chip.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Assumptions (Drivers + Anchors) ────────────────────────────────

function AssumptionsSection({
  inp, scenario, onScenario, onChange, fvs,
}: {
  inp: Inputs; scenario: string;
  onScenario: (s: "bear" | "base" | "bull") => void;
  onChange: (k: keyof Inputs, v: number) => void;
  fvs: Record<"bear" | "base" | "bull", number>;
}) {
  const [anchorsUnlocked, setAnchorsUnlocked] = useState(false);
  const set = (k: keyof Inputs) => (v: number) => onChange(k, v);

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-[16px] md:px-[22px] py-[14px] border-b border-slate-100 flex-wrap gap-[8px]">
        <div>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[14px] font-bold text-slate-900">Assumptions</p>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400 mt-[1px]">Edit drivers — fair value updates live</p>
        </div>
        {/* AI scenario chooser — horizontally scrollable on mobile */}
        <div className="flex items-center gap-[4px] bg-slate-100 rounded-[8px] p-[3px] overflow-x-auto">
          {(["bear", "base", "bull"] as const).map(s => (
            <button key={s} onClick={() => onScenario(s)}
              className={`px-[10px] py-[4px] rounded-[6px] border-0 cursor-pointer transition-colors text-center shrink-0 ${
                scenario === s ? "bg-white shadow-sm text-slate-900" : "bg-transparent text-slate-500 hover:text-slate-700"}`}>
              <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] font-semibold block">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[10px] font-bold block">
                ${f2(fvs[s])}
              </span>
            </button>
          ))}
          <div className="w-px h-[28px] bg-slate-200 mx-[2px] shrink-0" />
          <button onClick={() => onScenario("base")}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="px-[8px] py-[4px] text-[10px] text-slate-400 hover:text-blue-600 border-0 bg-transparent cursor-pointer font-medium shrink-0">
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:divide-x divide-slate-100">
        {/* ── Panel A: Your drivers ── */}
        <div className="flex-1 px-[16px] md:px-[22px] py-[16px] md:py-[18px] flex flex-col gap-[14px]">
          <div>
            <div className="flex items-center gap-[6px] mb-[4px] flex-wrap">
              <div className="size-[7px] rounded-full bg-blue-500 shrink-0" />
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[11px] font-bold text-slate-800">Your drivers</span>
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[10px] text-slate-400 hidden md:inline">— these judgments drive FCF, TV, and EV</span>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 leading-snug pl-[13px] hidden md:block">
              FCF comes from Revenue × FCF Margin. WACC discounts FCFs and Terminal Value into EV.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-[10px] md:gap-[12px]">
            <DriverField label="Revenue Growth Y1–5" value={inp.growthY1_5} ai={AI_INPUTS.growthY1_5} suffix="%" step={0.5} min={0} max={60} onChange={set("growthY1_5")} />
            <DriverField label="Revenue Growth Y6–10" value={inp.growthY6_10} ai={AI_INPUTS.growthY6_10} suffix="%" step={0.5} min={0} max={40} onChange={set("growthY6_10")} />
            <DriverField label="Terminal Growth (g)" value={inp.termGrowth} ai={AI_INPUTS.termGrowth} suffix="%" step={0.1} min={0} max={6} onChange={set("termGrowth")} />
            <DriverField label="WACC" value={inp.wacc} ai={AI_INPUTS.wacc} suffix="%" step={0.1} min={4} max={20} onChange={set("wacc")} />
            <DriverField label="FCF Margin Y1" value={inp.fcfMarginY1} ai={AI_INPUTS.fcfMarginY1} suffix="%" step={0.5} min={0} max={80} onChange={set("fcfMarginY1")} />
            <DriverField label="FCF Margin Terminal" value={inp.fcfMarginTerm} ai={AI_INPUTS.fcfMarginTerm} suffix="%" step={0.5} min={0} max={80} onChange={set("fcfMarginTerm")} />
          </div>
        </div>

        {/* ── Panel B: Anchors ── */}
        <div className="w-full md:w-[240px] md:shrink-0 bg-slate-50 px-[16px] md:px-[18px] py-[16px] md:py-[18px] flex flex-col gap-[10px] border-t md:border-t-0 border-slate-100">
          <div>
            <div className="flex items-center gap-[6px] mb-[4px]">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <rect x="3" y="4.5" width="5" height="4" rx="1" stroke="#94A3B8" strokeWidth="1.2" />
                <path d="M4 4.5V3.5a1.5 1.5 0 0 1 3 0v1" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[11px] font-bold text-slate-500">Anchors</span>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 leading-snug pl-[17px]">
              Prefetched from filings · override only if needed
            </p>
          </div>

          <div className="flex flex-col">
            {[
              { label: "TTM Revenue",       value: `$${inp.ttmRevenue.toLocaleString()}M`, key: "ttmRevenue" as keyof Inputs },
              { label: "Cash & Investments", value: `$${inp.cash.toLocaleString()}M`,       key: "cash"       as keyof Inputs },
              { label: "Total Debt",         value: `$${inp.debt.toLocaleString()}M`,        key: "debt"       as keyof Inputs },
              { label: "Diluted Shares",     value: `${inp.shares}M`,                        key: "shares"     as keyof Inputs },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-[7px] border-b border-slate-200 last:border-0">
                <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">{row.label}</span>
                {anchorsUnlocked ? (
                  <input type="number"
                    defaultValue={typeof inp[row.key] === "number" ? inp[row.key] as number : undefined}
                    onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(row.key, v); }}
                    className="w-[90px] text-right bg-white border border-blue-300 rounded-[5px] px-[6px] py-[3px] text-[11px] font-semibold text-slate-800 outline-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }} />
                ) : (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="text-[11px] font-semibold text-slate-500 tabular-nums">{row.value}</span>
                )}
              </div>
            ))}

            {/* Past 5Y CAGR — reference only */}
            <div className="flex items-center justify-between py-[7px] mt-[2px]">
              <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400">Past 5Y Rev CAGR</span>
              <div className="flex items-center gap-[4px]">
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] text-slate-400 tabular-nums">{PAST_5Y_CAGR}%</span>
                <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[9px] text-slate-300">ref</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[6px] pt-[4px]">
            <button onClick={() => setAnchorsUnlocked(v => !v)}
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-semibold text-slate-400 hover:text-blue-600 border border-dashed border-slate-300 hover:border-blue-400 rounded-[6px] px-[10px] py-[6px] bg-transparent cursor-pointer transition-colors text-center">
              {anchorsUnlocked ? "🔓 Locked — click to re-lock" : "🔒 Unlock to override"}
            </button>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 leading-snug text-center">
              Cash and debt convert EV into equity value per share.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: Bridge (always visible) ────────────────────────────────────────

function BridgeSection({ bridge, inp }: { bridge: Bridge; inp: Inputs }) {
  const [evExpanded, setEvExpanded] = useState(false);
  const pos = bridge.mos >= 0;

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      <div className="px-[22px] py-[14px] border-b border-slate-100">
        <div className="flex items-baseline gap-[10px]">
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[14px] font-bold text-slate-900">Valuation Bridge</p>
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400">
            Terminal Value {n0(bridge.tv)} · PV {n0(bridge.pvTv)}
          </span>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400 mt-[1px]">
          FCF → TV → EV → +Cash −Debt → Equity → FV/share
        </p>
      </div>

      <div className="px-[22px] py-[14px]">
        <div className="max-w-[520px] flex flex-col">
          {/* EV row — expandable */}
          <div>
            <button
              onClick={() => setEvExpanded(v => !v)}
              className="w-full flex items-center justify-between py-[9px] px-[12px] rounded-[8px] bg-slate-50 hover:bg-slate-100 transition-colors border-0 cursor-pointer text-left">
              <div className="flex items-center gap-[8px]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`shrink-0 transition-transform ${evExpanded ? "rotate-180" : ""}`}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-bold text-slate-800">Enterprise Value</span>
                <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400">
                  {evExpanded ? "— click to collapse" : "· click to see FCF + TV breakdown"}
                </span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[14px] font-bold text-slate-900 tabular-nums">
                {n0(bridge.ev)}
              </span>
            </button>

            {evExpanded && (
              <div className="mt-[2px] ml-[22px] flex flex-col border-l-2 border-slate-100 pl-[14px]">
                {[
                  { label: "Sum of PV of FCFs (10 yrs)", val: n0(bridge.pvFcfs) },
                  { label: `PV of Terminal Value (TV = FCF₁₀ × (1+g)/(WACC−g))`, val: n0(bridge.pvTv) },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-[6px]">
                    <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">{r.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[11px] font-semibold text-slate-600 tabular-nums">{r.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cash + Debt */}
          <div className="flex flex-col ml-[22px] mt-[4px]">
            {[
              { op: "+", label: "Cash & investments", val: n0(inp.cash), color: "text-emerald-600" },
              { op: "−", label: "Total debt",         val: n0(inp.debt), color: "text-red-500"     },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-[6px] border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-[10px]">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className={`text-[13px] font-bold w-[14px] shrink-0 ${r.color}`}>{r.op}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] text-slate-500">{r.label}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[12px] font-semibold text-slate-600 tabular-nums">{r.val}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-slate-200 mt-[2px]" />

          {/* Equity Value */}
          <div className="flex items-center justify-between py-[9px] px-[12px] rounded-[8px] bg-slate-50 mt-[4px]">
            <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-bold text-slate-800">Equity Value</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[14px] font-bold text-slate-900 tabular-nums">
              {n0(bridge.equity)}
            </span>
          </div>

          {/* Shares */}
          <div className="flex items-center justify-between py-[6px] ml-[22px]">
            <div className="flex items-center gap-[10px]">
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[13px] font-bold text-slate-300 w-[14px]">÷</span>
              <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] text-slate-500">Diluted shares outstanding</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[12px] font-semibold text-slate-600 tabular-nums">
              {f1(inp.shares)}M
            </span>
          </div>

          <div className="border-t-2 border-slate-900 mt-[2px]" />

          {/* FV hero */}
          <div className={`flex items-center justify-between py-[11px] px-[14px] rounded-[9px] mt-[6px] border ${
            pos ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div>
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className={`text-[12px] font-bold ${pos ? "text-emerald-700" : "text-red-600"}`}>= Fair Value / Share</span>
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[10px] text-slate-400 ml-[8px]">= Equity Value ÷ Shares</span>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className={`text-[22px] font-bold tabular-nums ${pos ? "text-emerald-700" : "text-red-500"}`}>
              ${f2(bridge.fv)}
            </span>
          </div>

          {/* Price + MOS */}
          <div className="flex flex-col gap-[4px] mt-[8px]">
            <div className="flex items-center justify-between px-[14px] py-[7px] bg-slate-50 rounded-[7px]">
              <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] text-slate-500">Current market price</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-[12px] font-semibold text-slate-700 tabular-nums">
                ${CURRENT_PRICE.toFixed(2)}
              </span>
            </div>
            <div className={`flex items-center justify-between px-[14px] py-[8px] rounded-[7px] ${pos ? "bg-emerald-50" : "bg-red-50"}`}>
              <span style={{ fontFamily: "'Inter', sans-serif" }}
                className={`text-[12px] font-bold ${pos ? "text-emerald-700" : "text-red-600"}`}>
                Margin of Safety
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                className={`text-[16px] font-bold tabular-nums ${pos ? "text-emerald-600" : "text-red-500"}`}>
                {sgn(bridge.mos)}{f1(bridge.mos)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section: 10-Year Forecast (collapsed by default) ────────────────────────

function ForecastSection({ rows, bridge }: { rows: YearRow[]; bridge: Bridge }) {
  const [open, setOpen] = useState(false);
  const last = rows[rows.length - 1];

  return (
    <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
      {/* collapsed header — always shows TV summary */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-[22px] py-[14px] text-left border-0 bg-transparent cursor-pointer hover:bg-slate-50 transition-colors">
        <div className="flex flex-col gap-[3px]">
          <div className="flex items-center gap-[10px]">
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[14px] font-bold text-slate-900">
              10-Year FCF Forecast
            </p>
            <div className="flex items-center gap-[5px]">
              <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
              <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-blue-600 font-semibold">
                Terminal Value {n0(bridge.tv)}
              </span>
              <div className="h-[3px] w-[3px] rounded-full bg-slate-300" />
              <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">
                PV {n0(bridge.pvTv)}
              </span>
            </div>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400">
            {open
              ? "Revenue → FCF by year · Terminal Value in final year · All figures $M"
              : "Open to verify the year-by-year path behind EV · All figures $M"}
          </p>
        </div>
        <div className="flex items-center gap-[8px] shrink-0 ml-[16px]">
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-blue-500 font-semibold">
            {open ? "Hide table" : "Show 10-year forecast"}
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* expanded table */}
      {open && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900">
                <th className="text-left px-[20px] py-[8px] w-[130px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver</span>
                </th>
                {rows.map((r, i) => (
                  <th key={r.year} className={`text-right px-[10px] py-[8px] ${i === 9 ? "bg-blue-900" : ""}`}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className={`text-[10px] font-bold ${i === 9 ? "text-blue-200" : "text-slate-300"}`}>
                      {r.year}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {/* Revenue */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-[20px] py-[7px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">Revenue</span>
                </td>
                {rows.map((r, i) => (
                  <td key={r.year} className={`text-right px-[10px] py-[7px] ${i === 9 ? "bg-blue-50/40" : ""}`}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[11px] text-slate-500 tabular-nums">
                      {Math.round(r.revenue).toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
              {/* YoY */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-[20px] py-[7px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">YoY Growth</span>
                </td>
                {rows.map((r, i) => (
                  <td key={r.year} className={`text-right px-[10px] py-[7px] ${i === 9 ? "bg-blue-50/40" : ""}`}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[11px] text-slate-400 tabular-nums">{f1(r.growthPct)}%</span>
                  </td>
                ))}
              </tr>
              {/* FCF — hero */}
              <tr className="bg-slate-50 border-y border-slate-200">
                <td className="px-[20px] py-[8px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] font-bold text-slate-800">Free Cash Flow</span>
                </td>
                {rows.map((r, i) => (
                  <td key={r.year} className={`text-right px-[10px] py-[8px] ${i === 9 ? "bg-blue-100/60" : ""}`}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className={`text-[11px] font-bold tabular-nums ${i === 9 ? "text-blue-700" : "text-slate-700"}`}>
                      {Math.round(r.fcf).toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
              {/* FCF Margin */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-[20px] py-[7px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-500">FCF Margin</span>
                </td>
                {rows.map((r, i) => (
                  <td key={r.year} className={`text-right px-[10px] py-[7px] ${i === 9 ? "bg-blue-50/40" : ""}`}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className="text-[11px] text-slate-400 tabular-nums">{f1(r.fcfMargin)}%</span>
                  </td>
                ))}
              </tr>
              {/* Terminal Value */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-[20px] py-[7px]">
                  <div>
                    <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] font-semibold text-blue-600">Terminal Value</span>
                    <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[9px] text-slate-400">FCF×(1+g)/(WACC−g)</p>
                  </div>
                </td>
                {rows.map((r, i) => (
                  <td key={r.year} className={`text-right px-[10px] py-[7px] ${i === 9 ? "bg-blue-50/40" : ""}`}>
                    {i === 9
                      ? <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          className="text-[11px] font-bold text-blue-600 tabular-nums">
                          {Math.round(bridge.tv).toLocaleString()}
                        </span>
                      : <span className="text-slate-200 text-[10px]">—</span>}
                  </td>
                ))}
              </tr>
              {/* Total = FCF + TV (final col only) */}
              <tr className="bg-blue-50/40 border-t-2 border-blue-200">
                <td className="px-[20px] py-[8px]">
                  <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] font-bold text-slate-800">Total</span>
                  <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[9px] text-slate-400">FCF + Terminal Value</p>
                </td>
                {rows.map((r, i) => (
                  <td key={r.year} className={`text-right px-[10px] py-[8px] ${i === 9 ? "bg-blue-100" : ""}`}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      className={`text-[11px] font-bold tabular-nums ${i === 9 ? "text-blue-800" : "text-slate-500"}`}>
                      {i === 9
                        ? Math.round(r.fcf + bridge.tv).toLocaleString()
                        : Math.round(r.fcf).toLocaleString()}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Right rail: AI Challenge + Evidence ─────────────────────────────────────

function AIRail({ inp }: { inp: Inputs }) {
  const challenges = useMemo(() => {
    const out: { field: string; note: string; bullets: string[]; q: string }[] = [];
    if (inp.growthY1_5 > 30) {
      out.push({
        field: "Revenue Growth Y1–5",
        note: `${f1(inp.growthY1_5)}% vs AI ${f1(AI_INPUTS.growthY1_5)}%`,
        bullets: [
          `${PAST_5Y_CAGR}% historical CAGR included strong deceleration years`,
          "Top-quartile SaaS growth at scale rarely exceeds 30%",
          "Requires sustained enterprise budget expansion",
        ],
        q: "What durable advantage sustains this growth through the full 5-year period?",
      });
    }
    if (inp.termGrowth > 5) {
      out.push({
        field: "Terminal Growth (g)",
        note: `${f1(inp.termGrowth)}% exceeds global GDP consensus`,
        bullets: [
          "Implies company outgrows the global economy in perpetuity",
          "EV is highly sensitive to g near WACC",
        ],
        q: "What structural moat sustains above-GDP perpetual growth?",
      });
    }
    if (inp.wacc < 7) {
      out.push({
        field: "WACC",
        note: `${f1(inp.wacc)}% — unusually low for high-growth tech`,
        bullets: [
          "Most high-growth SaaS companies priced at 9–11% WACC",
          "Implies near-investment-grade risk premium",
        ],
        q: "What justifies a near risk-free cost of capital here?",
      });
    }
    return out;
  }, [inp]);

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
        <div className="px-[14px] py-[12px] border-b border-slate-50">
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-bold text-slate-900">AI Challenge</p>
          <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 mt-[1px]">Critiques inputs · no trade advice</p>
        </div>
        <div className="px-[10px] py-[10px] flex flex-col gap-[7px]">
          {challenges.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] text-slate-400 leading-snug">
              Assumptions within normal bounds. Challenges appear when inputs diverge significantly from history.
            </p>
          ) : challenges.map((c, i) => (
            <div key={i} className="rounded-[8px] bg-amber-50 border border-amber-200 px-[10px] py-[9px] flex flex-col gap-[5px]">
              <div className="flex items-center gap-[5px]">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1L9.5 9H.5L5 1Z" fill="#F59E0B"/>
                  <path d="M5 4v2M5 7v.3" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] font-bold text-amber-700">{c.field}</span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-amber-600">{c.note}</p>
              <ul className="flex flex-col gap-[2px]">
                {c.bullets.map((b, j) => (
                  <li key={j} className="flex gap-[4px]">
                    <span className="text-amber-300 text-[8px] mt-[2px] shrink-0">•</span>
                    <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-amber-800 leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] italic text-amber-900 bg-amber-100 rounded-[5px] px-[7px] py-[5px] leading-snug">"{c.q}"</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-slate-100 overflow-hidden">
        <div className="px-[14px] py-[12px] border-b border-slate-50 flex items-center justify-between">
          <div>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-bold text-slate-900">Evidence</p>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] text-slate-400 mt-[1px]">Files behind assumptions</p>
          </div>
          <button style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[11px] font-bold text-blue-500 hover:text-blue-700 border-0 bg-transparent cursor-pointer p-0">+ Add</button>
        </div>
        <div className="px-[8px] py-[8px] flex flex-col gap-[2px]">
          {[
            { icon: "📄", label: "10-K FY2025",      sub: "Revenue, ARR, margins" },
            { icon: "📄", label: "10-Q Q2 FY2026",   sub: "NRR, CapEx commentary" },
            { icon: "🎙", label: "Earnings Call Q2",  sub: "Guidance, cohort data" },
            { icon: "📊", label: "Analyst consensus", sub: "Revenue & FCF estimates" },
          ].map(f => (
            <div key={f.label}
              className="flex items-center gap-[7px] rounded-[7px] px-[7px] py-[6px] hover:bg-slate-50 cursor-pointer transition-colors">
              <span className="text-[13px] shrink-0">{f.icon}</span>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[10px] font-semibold text-slate-700 truncate">{f.label}</p>
                <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[9px] text-slate-400 truncate">{f.sub}</p>
              </div>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0">
                <path d="M2.5 1.5l3 2.5-3 2.5" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────

type MethodId = "dcf" | "rdcf" | "pe" | "evebitda" | "sotp";
const METHODS: { id: MethodId; label: string }[] = [
  { id: "dcf",      label: "DCF" },
  { id: "rdcf",     label: "Reverse DCF" },
  { id: "pe",       label: "P/E" },
  { id: "evebitda", label: "EV/EBITDA" },
  { id: "sotp",     label: "SOTP" },
];

function TopBar({
  onBack, method, onMethod, myFairValue,
  saved, onSave, onSetFV, onUseInDecision, usedInDecision,
}: {
  onBack: () => void; method: MethodId; onMethod: (m: MethodId) => void;
  myFairValue: number | null; saved: boolean; onSave: () => void;
  onSetFV: () => void; onUseInDecision: () => void; usedInDecision: boolean;
}) {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
      {/* Context banner */}
      <div className="bg-blue-600 px-[16px] md:px-[24px] py-[6px] flex items-center gap-[8px]">
        <span className="size-[5px] rounded-full bg-blue-300 shrink-0" />
        <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[11px] font-semibold text-white flex-1 truncate">
          Setting valuation for your AAPL decision
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif" }} className="hidden md:block text-[10px] text-blue-200 shrink-0">
          Save model · then return to select it in Valuation used
        </span>
      </div>

      {/* Row 1: back + breadcrumb + action buttons */}
      <div className="flex items-center gap-[8px] md:gap-[10px] px-[16px] md:px-[24px] pt-[10px] pb-[6px] flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-[5px] text-slate-500 hover:text-slate-900 transition-colors border-0 bg-transparent cursor-pointer p-0 shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M8.5 10.5L4.5 6.5l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-medium">AAPL</span>
        </button>
        <span className="text-slate-200 hidden md:block">/</span>
        <div className="hidden md:flex items-center gap-[5px]">
          <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-[14px] font-bold text-slate-900">Datadog</span>
          <span className="text-slate-300">·</span>
          <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] font-semibold text-slate-500">Valuation</span>
          {myFairValue !== null && (
            <span style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-[7px] py-[2px] rounded-[100px] ml-[2px]">
              Fair Value set
            </span>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[6px]">
          <button onClick={onSave}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`px-[10px] md:px-[12px] py-[6px] rounded-[7px] text-[11px] font-bold border-0 cursor-pointer transition-colors ${
              saved ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            {saved ? "Saved ✓" : "Save"}
          </button>
          <button onClick={onSetFV}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="hidden md:block px-[12px] py-[6px] rounded-[7px] text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0 cursor-pointer transition-colors">
            Set Fair Value
          </button>
          <button onClick={onUseInDecision}
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`px-[10px] md:px-[12px] py-[6px] rounded-[7px] text-[11px] font-bold border-0 cursor-pointer transition-colors ${
              usedInDecision ? "bg-blue-100 text-blue-700" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {usedInDecision ? "Returning…" : "Use in decision"}
          </button>
        </div>
      </div>

      {/* Row 2: method tabs — horizontally scrollable on mobile */}
      <div className="px-[16px] md:px-[24px] pb-[10px] overflow-x-auto">
        <div className="flex items-center bg-slate-100 rounded-[7px] p-[3px] w-fit">
          {METHODS.map(m => (
            <button key={m.id} onClick={() => onMethod(m.id)}
              className={`px-[9px] py-[4px] rounded-[5px] text-[11px] font-semibold border-0 cursor-pointer transition-colors whitespace-nowrap ${
                method === m.id ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500 hover:text-slate-700"}`}
              style={{ fontFamily: "'Inter', sans-serif" }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ValuationPage() {
  const { back, navigate } = useRouter();
  const [inp, setInp]   = useState<Inputs>(AI_INPUTS);
  const [scenario, setScenario] = useState<string>("base");
  const [method, setMethod]     = useState<MethodId>("dcf");
  const [myFairValue, setMyFV]  = useState<number | null>(null);
  const [saved, setSaved]       = useState(false);
  const [usedInDecision, setUID]= useState(false);

  const rows   = useMemo(() => calcRows(inp),         [inp]);
  const bridge = useMemo(() => calcBridge(inp, rows), [inp, rows]);

  const fvs = useMemo(() => ({
    bear: calcBridge(SCENARIO_INPUTS.bear, calcRows(SCENARIO_INPUTS.bear)).fv,
    base: calcBridge(SCENARIO_INPUTS.base, calcRows(SCENARIO_INPUTS.base)).fv,
    bull: calcBridge(SCENARIO_INPUTS.bull, calcRows(SCENARIO_INPUTS.bull)).fv,
  }), []);

  function change(k: keyof Inputs, v: number) { setInp(p => ({ ...p, [k]: v })); setScenario("custom"); }
  function doScenario(s: "bear" | "base" | "bull") { setScenario(s); setInp(SCENARIO_INPUTS[s]); }
  function doSave() { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  function doSetFV() { setMyFV(parseFloat(bridge.fv.toFixed(2))); }
  function doUseInDecision() { setUID(true); setTimeout(() => navigate("/transaction/aapl"), 900); }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      <TopBar onBack={back} method={method} onMethod={setMethod}
        myFairValue={myFairValue} saved={saved} onSave={doSave}
        onSetFV={doSetFV} onUseInDecision={doUseInDecision} usedInDecision={usedInDecision} />

      {method === "rdcf" ? (
        <div className="flex-1 max-w-[1440px] mx-auto w-full px-[16px] md:px-[28px] py-[16px] md:py-[22px]">
          <ReverseDCFView
            onSwitchToDCF={() => setMethod("dcf")}
            onUseInDecision={doUseInDecision}
            usedInDecision={usedInDecision}
          />
        </div>
      ) : method === "pe" ? (
        <div className="flex-1 max-w-[1440px] mx-auto w-full px-[16px] md:px-[28px] py-[16px] md:py-[22px]">
          <PEView
            myFairValue={myFairValue}
            onSetFV={v => setMyFV(v)}
            onUseInDecision={doUseInDecision}
            usedInDecision={usedInDecision}
          />
        </div>
      ) : method !== "dcf" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-[10px]">
            <div className="size-[40px] rounded-full bg-slate-100 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v12M2 8h12" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif" }} className="text-[18px] font-bold text-slate-700">
              {METHODS.find(m => m.id === method)?.label} model
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] text-slate-400">Coming soon — switch back to DCF.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 max-w-[1440px] mx-auto w-full px-[16px] md:px-[28px] py-[16px] md:py-[22px]">
          <div className="flex flex-col md:flex-row gap-[12px] md:gap-[16px] items-start">
            {/* Main column */}
            <div className="w-full md:flex-1 min-w-0 flex flex-col gap-[12px]">
              <ResultsSection bridge={bridge} myFairValue={myFairValue}
                onSetFV={doSetFV} onUseInDecision={doUseInDecision} usedInDecision={usedInDecision} />
              <AssumptionsSection inp={inp} scenario={scenario} onScenario={doScenario} onChange={change} fvs={fvs} />
              <BridgeSection bridge={bridge} inp={inp} />
              <ForecastSection rows={rows} bridge={bridge} />
            </div>

            {/* Right rail — below main on mobile, sticky sidebar on desktop */}
            <div className="w-full md:w-[228px] md:shrink-0 md:sticky md:top-[120px]">
              <AIRail inp={inp} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
