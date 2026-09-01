"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { Quote, WatchlistItem } from "@mystockjournal/shared";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/use-debounced";
import { api } from "@/lib/api";
import { formatPercent, formatPrice } from "@/lib/format";
import { DECISIONS, decisionHref } from "@/lib/mock-journal";

type Row = {
  ticker: string;
  name: string;
  price: number | null;
  currency: string;
  changePercent: number | null;
  fairValue: number | null;
  mosPercent: number | null;
  inWatchlist: boolean;
};

function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function watchHref(ticker: string) {
  const d = DECISIONS.find((x) => x.ticker === ticker);
  return d ? decisionHref(d) : null;
}

function toWatchRow(item: WatchlistItem): Row {
  return {
    ticker: item.ticker,
    name: item.name,
    price: item.price,
    currency: item.currency,
    changePercent: item.changePercent,
    fairValue: item.fairValue,
    mosPercent: item.mosPercent,
    inWatchlist: true,
  };
}

function toSearchRow(item: Quote): Row {
  return {
    ticker: item.ticker,
    name: item.name,
    price: item.price,
    currency: item.currency,
    changePercent: item.changePercent,
    fairValue: null,
    mosPercent: null,
    inWatchlist: false,
  };
}

function WatchRowCells({ row }: { row: Row }) {
  const change = row.changePercent;
  const isUp = (change ?? 0) >= 0;
  return (
    <>
      <span className="font-mono text-[15px] font-bold text-slate-900">{row.ticker}</span>
      <span className="font-mono text-[14px] tabular-nums text-slate-700">
        {formatPrice(row.price, row.currency)}
      </span>
      <span className="font-mono text-[14px] tabular-nums text-slate-500">
        {formatPrice(row.fairValue, row.currency)}
      </span>
      <span
        className={`text-right font-mono text-[14px] font-semibold tabular-nums ${
          change == null ? "text-slate-400" : isUp ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {change == null ? "—" : `${isUp ? "▲" : "▼"} ${formatPercent(change)}`}
      </span>
    </>
  );
}

function WatchCardMobile({ row, onAdd }: { row: Row; onAdd?: (ticker: string) => void }) {
  const href = row.inWatchlist ? watchHref(row.ticker) : null;
  const mos = row.mosPercent ?? row.changePercent;
  const isUp = (mos ?? 0) >= 0;
  const mosLabel = row.mosPercent != null ? "MOS" : "Chg";
  const card = (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3.5 py-3 active:bg-slate-50">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[15px] leading-none font-bold text-slate-900">{row.ticker}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[13px] tabular-nums text-slate-600">
            {formatPrice(row.price, row.currency)}
          </span>
          <span className="text-[10px] text-slate-400">close</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">Fair Value</span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-700">
          {formatPrice(row.fairValue, row.currency)}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        {row.inWatchlist ? (
          <>
            <span className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">{mosLabel}</span>
            <span
              className={`font-mono text-[16px] font-bold tabular-nums ${
                mos == null ? "text-slate-400" : isUp ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {mos == null ? "—" : `${isUp ? "▲" : "▼"}${formatPercent(mos, 1)}`}
            </span>
          </>
        ) : (
          <span className="rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-600">
            Add
          </span>
        )}
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
  if (!row.inWatchlist && onAdd) {
    return (
      <button type="button" className="block w-full text-left" onClick={() => onAdd(row.ticker)}>
        {card}
      </button>
    );
  }
  return card;
}

export function WatchList() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 300);
  const cols = "grid-cols-[96px_1fr_1fr_100px]";

  const watchQuery = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => api<{ items: WatchlistItem[] }>("/watchlist"),
  });

  const watchRows = useMemo(
    () => (watchQuery.data?.items ?? []).map(toWatchRow),
    [watchQuery.data],
  );

  const q = query.trim().toLowerCase();
  const localMatches = q
    ? watchRows.filter((r) => r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
    : watchRows;
  const useRemote = q.length > 0 && localMatches.length === 0;

  const searchQuery = useQuery({
    queryKey: ["quote-search", debounced],
    queryFn: () => api<{ items: Quote[] }>(`/quotes/search?q=${encodeURIComponent(debounced)}`),
    enabled: useRemote && debounced.length > 0 && debounced === query.trim(),
  });

  const addMutation = useMutation({
    mutationFn: (ticker: string) =>
      api("/watchlist", { method: "POST", body: JSON.stringify({ ticker }) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      setQuery("");
    },
  });

  const remoteRows = (searchQuery.data?.items ?? []).map(toSearchRow);
  const rows = useRemote ? remoteRows : localMatches;
  const colsHeader = useRemote ? ["Ticker", "Close Price", "Name", "% Change"] : ["Ticker", "Close Price", "My Fair Value", "% Change"];

  function addTicker(ticker: string) {
    addMutation.mutate(ticker);
  }

  return (
    <section id="watch-list" className="w-full scroll-mt-16 py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 md:mb-5">
          <div>
            <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">Watch List</h2>
            <p className="mt-1 text-[12px] text-slate-400 md:text-[13px]">
              {useRemote
                ? "Not in your list — showing prior-close quotes. Click a row to add."
                : "Prior close vs your fair value."}
            </p>
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

        {watchQuery.isError && (
          <p className="mb-4 text-[13px] text-red-500">Couldn’t load quotes. Is the API running?</p>
        )}
        {addMutation.isError && (
          <p className="mb-4 text-[13px] text-red-500">Couldn’t add that ticker. Try another symbol.</p>
        )}

        <div className="flex flex-col gap-2 md:hidden">
          {watchQuery.isLoading && <p className="py-6 text-center text-[13px] text-slate-400">Loading quotes…</p>}
          {useRemote && searchQuery.isFetching && (
            <p className="py-6 text-center text-[13px] text-slate-400">Searching market…</p>
          )}
          {!watchQuery.isLoading && !(useRemote && searchQuery.isFetching) && rows.length === 0 && (
            <p className="py-6 text-center text-[13px] text-slate-400">
              {q ? `No tickers match “${query}”` : "Your watch list is empty."}
            </p>
          )}
          {!(useRemote && searchQuery.isFetching) &&
            rows.map((row) => <WatchCardMobile key={row.ticker} row={row} onAdd={addTicker} />)}
        </div>

        <div className="hidden md:block">
          <div
            className={`grid ${cols} gap-4 border-b border-slate-100 pb-2 text-[11px] font-semibold tracking-[0.07em] text-slate-400 uppercase`}
          >
            {colsHeader.map((label) => (
              <span key={label} className={label === "% Change" ? "text-right" : undefined}>
                {label}
              </span>
            ))}
          </div>
          <div className="divide-y divide-slate-50">
            {watchQuery.isLoading && <p className="py-6 text-[13px] text-slate-400">Loading quotes…</p>}
            {useRemote && searchQuery.isFetching && (
              <p className="py-6 text-[13px] text-slate-400">Searching market…</p>
            )}
            {!watchQuery.isLoading && !(useRemote && searchQuery.isFetching) && rows.length === 0 && (
              <p className="py-6 text-[13px] text-slate-400">
                {q ? `No tickers match “${query}”` : "Your watch list is empty."}
              </p>
            )}
            {!(useRemote && searchQuery.isFetching) &&
              rows.map((row) => {
                const href = row.inWatchlist ? watchHref(row.ticker) : null;
                const cells = (
                  <div className={`grid ${cols} items-center gap-4 py-4`}>
                    {useRemote ? (
                      <>
                        <span className="font-mono text-[15px] font-bold text-slate-900">{row.ticker}</span>
                        <span className="font-mono text-[14px] tabular-nums text-slate-700">
                          {formatPrice(row.price, row.currency)}
                        </span>
                        <span className="truncate text-[13px] text-slate-500">{row.name}</span>
                        <span
                          className={`text-right font-mono text-[14px] font-semibold tabular-nums ${
                            (row.changePercent ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {row.changePercent == null
                            ? "—"
                            : `${row.changePercent >= 0 ? "▲" : "▼"} ${formatPercent(row.changePercent)}`}
                        </span>
                      </>
                    ) : (
                      <WatchRowCells row={row} />
                    )}
                  </div>
                );
                if (href) {
                  return (
                    <Link
                      key={row.ticker}
                      href={href}
                      className="-mx-3 block rounded-lg px-3 transition-colors hover:bg-slate-50"
                    >
                      {cells}
                    </Link>
                  );
                }
                if (!row.inWatchlist) {
                  return (
                    <button
                      key={row.ticker}
                      type="button"
                      onClick={() => addTicker(row.ticker)}
                      className="-mx-3 block w-full rounded-lg px-3 text-left transition-colors hover:bg-slate-50"
                    >
                      {cells}
                    </button>
                  );
                }
                return <div key={row.ticker}>{cells}</div>;
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
