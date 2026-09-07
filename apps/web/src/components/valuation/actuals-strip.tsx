"use client";

import { useState } from "react";
import type { QuarterlyActual } from "@mystockjournal/shared";
import { fmtSigned } from "./primitives";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(end: string) {
  const month = Number(end.slice(5, 7));
  const year = end.slice(0, 4);
  return `${MONTHS[month - 1] ?? end.slice(5, 7)} ${year}`;
}

function fmtActualMoney(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000) {
    const billions = abs / 1000;
    return `${sign}$${billions >= 10 ? billions.toFixed(0) : billions.toFixed(1)}B`;
  }
  if (abs >= 100) return `${sign}$${Math.round(abs).toLocaleString()}M`;
  return `${sign}$${abs.toFixed(1)}M`;
}

function fmtMargin(value: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function ActualsStrip({ actuals }: { actuals: QuarterlyActual[] }) {
  const tabs = [...actuals].reverse();
  const [end, setEnd] = useState(tabs[0]?.end ?? "");
  const selected = tabs.find((row) => row.end === end) ?? tabs[0];
  if (!selected) return null;

  const metrics = [
    { label: "Revenue", value: fmtActualMoney(selected.revenue), note: "actual" },
    {
      label: "YoY growth",
      value: selected.yoyGrowth == null ? "—" : fmtSigned(selected.yoyGrowth),
      note: "vs prior yr",
    },
    { label: "FCF margin", value: fmtMargin(selected.fcfMargin), note: "of revenue" },
    { label: "FCF", value: selected.fcf == null ? "—" : fmtActualMoney(selected.fcf), note: "free cash flow" },
    { label: "Op. margin", value: fmtMargin(selected.opMargin), note: "GAAP" },
  ];

  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
      <div className="flex items-end gap-3 overflow-x-auto border-b border-slate-100 px-3 pt-2">
        <span className="mb-1.5 shrink-0 text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase">
          Actuals
        </span>
        {tabs.map((row) => {
          const active = row.end === selected.end;
          return (
            <button
              key={row.end}
              type="button"
              onClick={() => setEnd(row.end)}
              className={`shrink-0 px-1 pb-1.5 text-left ${
                active ? "border-b-2 border-blue-600" : "border-b-2 border-transparent"
              }`}
            >
              <span className={`block text-[11px] font-bold ${active ? "text-blue-600" : "text-slate-700"}`}>
                Q{row.quarter} FY{String(row.fy).slice(-2)}
              </span>
              <span className={`block text-[9px] ${active ? "text-blue-500" : "text-slate-400"}`}>
                {monthLabel(row.end)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100 md:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-0.5 px-3 py-2.5">
            <span className="text-[9px] font-bold tracking-[0.08em] text-slate-400 uppercase">{metric.label}</span>
            <span className="text-[15px] font-bold text-slate-900 tabular-nums">{metric.value}</span>
            <span className="text-[10px] text-slate-400">{metric.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
