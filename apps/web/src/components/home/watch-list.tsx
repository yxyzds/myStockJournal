"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DECISIONS, WATCH_ROWS, decisionHref, type MockWatchRow } from "@/lib/mock-journal";

function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WatchRowCells({ row }: { row: MockWatchRow }) {
  const isUp = row.changePercent >= 0;
  return (
    <>
      <span className="font-mono text-[15px] font-bold text-slate-900">{row.ticker}</span>
      <span className="font-mono text-[14px] tabular-nums text-slate-700">{row.closePrice}</span>
      <span className="font-mono text-[14px] tabular-nums text-slate-500">{row.fairValue}</span>
      <span
        className={`text-right font-mono text-[14px] font-semibold tabular-nums ${isUp ? "text-emerald-600" : "text-red-500"}`}
      >
        {isUp ? "▲" : "▼"} {Math.abs(row.changePercent).toFixed(2)}%
      </span>
    </>
  );
}

function watchHref(row: MockWatchRow) {
  if (!row.decisionId) return null;
  const d = DECISIONS.find((x) => x.id === row.decisionId);
  return d ? decisionHref(d) : null;
}

function WatchCardMobile({ row }: { row: MockWatchRow }) {
  const isUp = row.changePercent >= 0;
  const href = watchHref(row);
  const card = (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-3 active:bg-slate-50">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[15px] leading-none font-bold text-slate-900">{row.ticker}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[13px] tabular-nums text-slate-600">{row.closePrice}</span>
          <span className="text-[10px] text-slate-400">close</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">Fair Value</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-700">{row.fairValue}</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">MOS</span>
        <span
          className={`font-mono text-[16px] font-bold tabular-nums ${isUp ? "text-emerald-600" : "text-red-500"}`}
        >
          {isUp ? "▲" : "▼"}
          {Math.abs(row.changePercent).toFixed(1)}%
        </span>
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}

export function WatchList() {
  const [query, setQuery] = useState("");
  const filtered = WATCH_ROWS.filter((r) => r.ticker.toLowerCase().includes(query.toLowerCase()));
  const cols = "grid-cols-[96px_1fr_1fr_100px]";

  return (
    <section id="watch-list" className="w-full scroll-mt-16 py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 md:mb-5">
          <div>
            <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">Watch List</h2>
            <p className="mt-1 text-[12px] text-slate-400 md:text-[13px]">Your tracked positions at a glance.</p>
          </div>
          <div className="relative w-full md:w-[260px]">
            <div className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2">
              <SearchIcon />
            </div>
            <Input
              id="watch-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker…"
              className="h-[38px] rounded-[9px] bg-white pr-8 pl-[34px] font-mono text-[13px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:hidden">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-[13px] text-slate-400">No tickers match “{query}”</p>
          )}
          {filtered.map((row) => (
            <WatchCardMobile key={row.ticker} row={row} />
          ))}
        </div>

        <div className="hidden md:block">
          <div
            className={`grid ${cols} gap-4 border-b border-slate-100 pb-2 text-[11px] font-semibold tracking-[0.07em] text-slate-400 uppercase`}
          >
            <span>Ticker</span>
            <span>Close Price</span>
            <span>My Fair Value</span>
            <span className="text-right">% Change</span>
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && <p className="py-6 text-[13px] text-slate-400">No tickers match “{query}”</p>}
            {filtered.map((row) => {
              const href = watchHref(row);
              const cells = (
                <div className={`grid ${cols} items-center gap-4 py-4`}>
                  <WatchRowCells row={row} />
                </div>
              );
              if (!href) return <div key={row.ticker}>{cells}</div>;
              return (
                <Link
                  key={row.ticker}
                  href={href}
                  className="-mx-3 block rounded-lg px-3 transition-colors hover:bg-slate-50"
                >
                  {cells}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
