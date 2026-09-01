"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/logo-mark";
import { Input } from "@/components/ui/input";
import { DECISIONS, WATCH_ROWS, decisionHref } from "@/lib/mock-journal";

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function jumpToTicker(raw: string) {
  const q = raw.trim().toUpperCase();
  if (!q) return null;
  const decision = DECISIONS.find((d) => d.ticker === q);
  if (decision) return decisionHref(decision);
  const watch = WATCH_ROWS.find((r) => r.ticker === q);
  if (watch) return `/#watch-list`;
  return null;
}

export function SiteNav({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  function focusWatchSearch() {
    const el = document.getElementById("watch-search") as HTMLInputElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
      return true;
    }
    return false;
  }

  function onSearchClick() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      if (!focusWatchSearch()) router.push("/#watch-list");
      return;
    }
    setSearchOpen((v) => !v);
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const href = jumpToTicker(query);
    if (href) {
      router.push(href);
      setSearchOpen(false);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <LogoMark size={30} />
          <span className="font-heading truncate text-[15px] font-semibold tracking-tight text-slate-900">
            MyStockJournal
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {showSearch && (
            <button
              type="button"
              onClick={onSearchClick}
              className="text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
          )}
          <div className="flex size-8 items-center justify-center rounded-full bg-slate-900">
            <span className="text-[11px] font-semibold tracking-wide text-white">AM</span>
          </div>
        </div>
      </div>
      {searchOpen && showSearch && (
        <form onSubmit={submitSearch} className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="relative">
            <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
              <SearchIcon size={16} />
            </div>
            <Input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ticker — AAPL, NVDA…"
              className="h-[42px] rounded-[9px] bg-slate-50 pl-9 text-[14px]"
              enterKeyHint="search"
            />
          </div>
        </form>
      )}
    </header>
  );
}
