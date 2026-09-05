"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  METHOD_LABELS,
  type Quote,
  type ValuationMethod,
  type WatchlistItem,
} from "@mystockjournal/shared";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/use-debounced";
import { api } from "@/lib/api";
import { formatPercent, formatPrice, formatQuoteAsOf } from "@/lib/format";
import { stockHref } from "@/lib/mock-journal";

type Row = {
  ticker: string;
  name: string;
  price: number | null;
  currency: string;
  changePercent: number | null;
  fairValue: number | null;
  fairValueMethod: ValuationMethod | null;
  mosPercent: number | null;
  fetchedAt: string | null;
  inWatchlist: boolean;
};

function valuationHref(ticker: string) {
  return `/stock/${ticker.trim().toUpperCase()}/valuation`;
}

function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function latestFetchedAt(rows: { fetchedAt: string | null }[]) {
  return rows.reduce<string | null>((best, row) => {
    if (!row.fetchedAt) return best;
    if (!best || row.fetchedAt > best) return row.fetchedAt;
    return best;
  }, null);
}

function toWatchRow(item: WatchlistItem): Row {
  return {
    ticker: item.ticker,
    name: item.name,
    price: item.price,
    currency: item.currency,
    changePercent: item.changePercent,
    fairValue: item.fairValue,
    fairValueMethod: item.fairValueMethod,
    mosPercent: item.mosPercent,
    fetchedAt: item.fetchedAt,
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
    fairValueMethod: null,
    mosPercent: null,
    fetchedAt: item.fetchedAt,
    inWatchlist: false,
  };
}

/** Fair-value cell: +Valuation CTA, or price + method — both open the valuation page. */
function FairValueLink({
  row,
  layout,
}: {
  row: Row;
  layout: "desktop" | "mobile";
}) {
  const href = valuationHref(row.ticker);
  const methodLabel =
    row.fairValueMethod != null ? METHOD_LABELS[row.fairValueMethod] : null;

  if (row.fairValue == null) {
    return (
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className={
          layout === "desktop"
            ? "relative z-10 inline-flex w-fit items-center rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            : "relative z-10 inline-flex items-center rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:border-blue-400 hover:text-blue-700"
        }
      >
        +Valuation
      </Link>
    );
  }

  if (layout === "mobile") {
    return (
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex flex-col items-center gap-0.5 rounded-md px-1 hover:bg-slate-50"
      >
        <span className="font-mono text-[13px] font-semibold tabular-nums text-slate-700">
          {formatPrice(row.fairValue, row.currency)}
        </span>
        {methodLabel && (
          <span className="text-[9px] font-bold tracking-wide text-blue-600 uppercase">
            {methodLabel}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="relative z-10 inline-flex w-fit flex-col items-start gap-0.5 rounded-md hover:bg-slate-50"
    >
      <span className="font-mono text-[14px] tabular-nums text-slate-700">
        {formatPrice(row.fairValue, row.currency)}
      </span>
      {methodLabel && (
        <span className="text-[10px] font-semibold tracking-wide text-blue-600 uppercase">
          {methodLabel}
        </span>
      )}
    </Link>
  );
}

function RowAction({
  kind,
  ticker,
  pending,
  onClick,
}: {
  kind: "add" | "remove";
  ticker: string;
  pending: boolean;
  onClick: (ticker: string) => void;
}) {
  const isAdd = kind === "add";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(ticker);
      }}
      aria-label={isAdd ? `Add ${ticker} to watch list` : `Remove ${ticker} from watch list`}
      className={
        isAdd
          ? "rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          : "flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
      }
    >
      {isAdd ? (pending ? "…" : "Add") : pending ? "…" : "×"}
    </button>
  );
}

function RemoveConfirmDialog({
  ticker,
  name,
  pending,
  onCancel,
  onConfirm,
}: {
  ticker: string;
  name: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dismiss"
        disabled={pending}
        className="absolute inset-0 bg-slate-900/30"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-watch-title"
        className="relative w-full max-w-[360px] rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_40px_rgba(15,23,42,0.12)]"
      >
        <h3 id="remove-watch-title" className="font-heading text-[18px] font-bold text-slate-900">
          Remove {ticker}?
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          {name} will leave your Watch List. Journal entries stay.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-[13px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {pending ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockRowDesktop({ row }: { row: Row }) {
  const gap = row.mosPercent;
  const undervalued = (gap ?? 0) >= 0;
  return (
    <>
      <span className="font-mono text-[15px] font-bold text-slate-900">{row.ticker}</span>
      <span className="font-mono text-[14px] tabular-nums text-slate-700">
        {formatPrice(row.price, row.currency)}
      </span>
      <FairValueLink row={row} layout="desktop" />
      <span
        className={`text-right font-mono text-[14px] font-semibold tabular-nums ${
          gap == null ? "text-slate-400" : undervalued ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {gap == null ? "—" : `${undervalued ? "▲" : "▼"} ${formatPercent(gap)}`}
      </span>
    </>
  );
}

function StockRowMobile({
  row,
  pending,
  onAdd,
  onRemove,
}: {
  row: Row;
  pending: boolean;
  onAdd: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}) {
  const href = stockHref(row.ticker);
  const gap = row.mosPercent;
  const undervalued = (gap ?? 0) >= 0;

  return (
    <div className="relative flex items-center gap-1 rounded-xl border border-slate-100 bg-white py-3 pr-1.5 pl-3.5 transition-colors hover:bg-slate-50">
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Open ${row.ticker}`}
      />
      <div className="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-2 pointer-events-none">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[15px] leading-none font-bold text-slate-900">{row.ticker}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[13px] tabular-nums text-slate-600">
              {formatPrice(row.price, row.currency)}
            </span>
            <span className="text-[10px] text-slate-400">close</span>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <span className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">Fair Value</span>
          <FairValueLink row={row} layout="mobile" />
        </div>
        <div className="flex flex-col items-end gap-1">
          {row.inWatchlist ? (
            <>
              <span className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">vs FV</span>
              <span
                className={`font-mono text-[16px] font-bold tabular-nums ${
                  gap == null ? "text-slate-400" : undervalued ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {gap == null ? "—" : `${undervalued ? "▲" : "▼"}${formatPercent(gap, 1)}`}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="relative z-10">
        <RowAction
          kind={row.inWatchlist ? "remove" : "add"}
          ticker={row.ticker}
          pending={pending}
          onClick={row.inWatchlist ? onRemove : onAdd}
        />
      </div>
    </div>
  );
}

export function WatchList() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ ticker: string; name: string } | null>(null);
  const debouncedQuery = useDebounced(query.trim(), 300);
  const cols = "grid-cols-[96px_1fr_1fr_120px_44px]";

  const watchQuery = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => api<{ items: WatchlistItem[] }>("/watchlist"),
  });

  const watchRows = useMemo(
    () => (watchQuery.data?.items ?? []).map(toWatchRow),
    [watchQuery.data],
  );

  const q = query.trim().toLowerCase();

  // Tickers already on the watch list that match the search box.
  const watchlistMatches = q
    ? watchRows.filter((r) => r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
    : watchRows;
  const showingMarketSearch = q.length > 0 && watchlistMatches.length === 0;

  const searchQuery = useQuery({
    queryKey: ["quote-search", debouncedQuery],
    queryFn: () => api<{ items: Quote[] }>(`/quotes/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: showingMarketSearch && debouncedQuery === query.trim(),
  });

  const addMutation = useMutation({
    mutationFn: (ticker: string) =>
      api("/watchlist", { method: "POST", body: JSON.stringify({ ticker }) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      setQuery("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (ticker: string) => api(`/watchlist/${encodeURIComponent(ticker)}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      setRemoveTarget(null);
    },
  });

  const marketSearchRows = (searchQuery.data?.items ?? []).map(toSearchRow);
  const displayedRows = showingMarketSearch ? marketSearchRows : watchlistMatches;
  const colsHeader = showingMarketSearch
    ? ["Ticker", "Close Price", "Name", "% Change", ""]
    : ["Ticker", "Close Price", "My Fair Value", "vs Fair Value", ""];
  const asOfIso = latestFetchedAt(showingMarketSearch ? marketSearchRows : watchRows);
  const asOfLabel = formatQuoteAsOf(asOfIso);
  const busyTicker = addMutation.isPending
    ? addMutation.variables
    : removeMutation.isPending
      ? removeMutation.variables
      : null;

  return (
    <section id="watch-list" className="w-full scroll-mt-16 py-8 md:py-12">
      <div className="mx-auto max-w-[1080px] px-4 md:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 md:mb-5">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h2 className="font-heading text-[20px] font-bold text-slate-900 md:text-2xl">Watch List</h2>
              {asOfLabel && asOfIso && (
                <time dateTime={asOfIso} className="font-mono text-[11px] text-slate-400 md:text-[12px]">
                  {asOfLabel}
                </time>
              )}
            </div>
            <p className="mt-1 text-[12px] text-slate-400 md:text-[13px]">
              {showingMarketSearch
                ? "Not in your list — tap Add to track a ticker."
                : "vs Fair Value = (fair value − close) ÷ close."}
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
              className="h-[38px] rounded-[9px] bg-white pr-8 pl-[34px] font-mono text-[13px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
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
        {removeMutation.isError && (
          <p className="mb-4 text-[13px] text-red-500">Couldn’t remove that ticker. Try again.</p>
        )}

        {/* Mobile layout */}
        <div className="flex flex-col gap-2 md:hidden">
          {watchQuery.isLoading && <p className="py-6 text-center text-[13px] text-slate-400">Loading quotes…</p>}
          {showingMarketSearch && searchQuery.isFetching && (
            <p className="py-6 text-center text-[13px] text-slate-400">Searching market…</p>
          )}
          {!watchQuery.isLoading && !(showingMarketSearch && searchQuery.isFetching) && displayedRows.length === 0 && (
            <p className="py-6 text-center text-[13px] text-slate-400">
              {q ? `No tickers match “${query}”` : "Your watch list is empty."}
            </p>
          )}
          {!(showingMarketSearch && searchQuery.isFetching) &&
            displayedRows.map((row) => (
              <StockRowMobile
                key={row.ticker}
                row={row}
                pending={busyTicker === row.ticker}
                onAdd={(ticker) => addMutation.mutate(ticker)}
                onRemove={(ticker) => setRemoveTarget({ ticker, name: row.name })}
              />
            ))}
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block">
          <div
            className={`grid ${cols} gap-4 border-b border-slate-100 pb-2 text-[11px] font-semibold tracking-[0.07em] text-slate-400 uppercase`}
          >
            {colsHeader.map((label, i) => (
              <span
                key={`${label}-${i}`}
                className={
                  label === "% Change" || label === "vs Fair Value" || !label ? "text-right" : undefined
                }
              >
                {label}
              </span>
            ))}
          </div>
          <div className="divide-y divide-slate-50">
            {watchQuery.isLoading && <p className="py-6 text-[13px] text-slate-400">Loading quotes…</p>}
            {showingMarketSearch && searchQuery.isFetching && (
              <p className="py-6 text-[13px] text-slate-400">Searching market…</p>
            )}
            {!watchQuery.isLoading && !(showingMarketSearch && searchQuery.isFetching) && displayedRows.length === 0 && (
              <p className="py-6 text-[13px] text-slate-400">
                {q ? `No tickers match “${query}”` : "Your watch list is empty."}
              </p>
            )}
            {!(showingMarketSearch && searchQuery.isFetching) &&
              displayedRows.map((row) => (
                <div
                  key={row.ticker}
                  className="relative -mx-3 rounded-lg transition-colors hover:bg-slate-50"
                >
                  <Link
                    href={stockHref(row.ticker)}
                    className="absolute inset-0 z-0 rounded-lg"
                    aria-label={`Open ${row.ticker}`}
                  />
                  <div className={`grid ${cols} items-center gap-4 px-3 py-4`}>
                    {showingMarketSearch ? (
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
                      <StockRowDesktop row={row} />
                    )}
                    <div className="relative z-10 flex justify-end">
                      <RowAction
                        kind={row.inWatchlist ? "remove" : "add"}
                        ticker={row.ticker}
                        pending={busyTicker === row.ticker}
                        onClick={
                          row.inWatchlist
                            ? (t) => setRemoveTarget({ ticker: t, name: row.name })
                            : (t) => addMutation.mutate(t)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
      {removeTarget && (
        <RemoveConfirmDialog
          ticker={removeTarget.ticker}
          name={removeTarget.name}
          pending={removeMutation.isPending}
          onCancel={() => {
            if (!removeMutation.isPending) setRemoveTarget(null);
          }}
          onConfirm={() => removeMutation.mutate(removeTarget.ticker)}
        />
      )}
    </section>
  );
}
