import { useState } from "react";
import { Link } from "../router";

// ─── Logo mark (inline, no external dep) ─────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  const rings = [18, 24, 30, 36, 42, 48];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0f172a" />
      <defs>
        <filter id="logo-shadow" x="-20%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="-1" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="18" y="11" width="38" height="42" rx="3" fill="#dce8f5" filter="url(#logo-shadow)" />
      {[21, 28, 35, 42].map(y => (
        <line key={y} x1="23" y1={y} x2="52" y2={y} stroke="#b8cfea" strokeWidth="1.1" strokeLinecap="round" />
      ))}
      <text x="24" y="26.5" fontSize="5" fill="#5a7a9a"
        fontFamily="'JetBrains Mono','Courier New',monospace" letterSpacing="0.2">P/E</text>
      <text x="37" y="26.5" fontSize="5.2" fill="#10b981" fontWeight="700"
        fontFamily="'JetBrains Mono','Courier New',monospace">24×</text>
      <path d="M 23 42 C 24 44, 28 40, 32 36 C 36 32, 38 27, 42 23 C 44 21, 47 17, 51 14"
        fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="51" cy="14" r="2.8" fill="#10b981" />
      <circle cx="23" cy="42" r="1.8" fill="#10b981" opacity="0.25" />
      {rings.map(y => (
        <g key={y}>
          <circle cx="18" cy={y} r="3.4" fill="#dce8f5" />
          <circle cx="18" cy={y} r="3.4" fill="none" stroke="#7a9aba" strokeWidth="1.4" />
          <circle cx="18" cy={y} r="1.5" fill="#0f172a" />
        </g>
      ))}
    </svg>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M4 6L8 10L12 6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2L12 12M12 2L2 12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function TopNav() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-30">
      {/* Main bar */}
      <div className="max-w-[1080px] mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-[8px]">
          <LogoMark size={30} />
          <span
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[15px] font-semibold text-slate-900 tracking-tight"
          >
            MyStockJournal
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search — icon-only on mobile, always visible */}
          <button
            onClick={() => setSearchOpen(v => !v)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Search"
          >
            <SearchIcon />
          </button>
          {/* Avatar */}
          <div className="size-8 rounded-full bg-slate-900 flex items-center justify-center">
            <span
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-white text-[11px] font-semibold tracking-wide"
            >
              AM
            </span>
          </div>
        </div>
      </div>

      {/* Mobile inline search drawer */}
      {searchOpen && (
        <div className="md:hidden border-t border-slate-100 px-4 py-3 bg-white">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon size={16} />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Ticker — AAPL, NVDA…"
              style={{ fontFamily: "'Inter', sans-serif" }}
              className="w-full h-[42px] pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-[9px] text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Recent Decisions ─────────────────────────────────────────────────────────

type Decision = {
  date: string;
  action: string;
  actionColor: string;
  ticker: string;
  rationale: string;
  score?: number;
  scoreVariant?: "strong" | "weak" | "none";
  href?: string;
};

const DECISIONS: Decision[] = [
  {
    date: "Aug 27",
    action: "BUY",
    actionColor: "green",
    ticker: "AAPL",
    rationale: "Added — AI should accelerate the iPhone upgrade cycle.",
    score: 78,
    scoreVariant: "strong",
    href: "/transaction/aapl",
  },
  {
    date: "Aug 24",
    action: "THESIS UPDATE",
    actionColor: "blue",
    ticker: "NVDA",
    rationale: "AI CapEx is slowing; reviewing my growth assumption.",
    scoreVariant: "none",
  },
  {
    date: "Aug 22",
    action: "BUY",
    actionColor: "green",
    ticker: "NVDA",
    rationale: "Bought the dip, but did I really test my thesis?",
    score: 62,
    scoreVariant: "weak",
  },
];

function ActionChip({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700",
    blue:  "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
      className={`inline-flex items-center px-[7px] py-[3px] rounded-[4px] text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap ${styles[color] ?? styles.blue}`}
    >
      {label}
    </span>
  );
}

function ScoreControl({ score, variant }: { score?: number; variant?: string }) {
  if (variant === "none") {
    return (
      <button
        style={{ fontFamily: "'Inter', sans-serif" }}
        className="text-[12px] font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap border border-blue-200 rounded-[6px] px-[10px] py-[5px] md:px-[12px] md:py-[6px] hover:bg-blue-50 transition-colors"
      >
        Rate →
      </button>
    );
  }
  const isWeak = variant === "weak";
  return (
    <span className="flex items-baseline gap-[2px]">
      <span
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className={`text-[22px] md:text-[28px] font-bold leading-none tabular-nums ${isWeak ? "text-amber-500" : "text-emerald-600"}`}
      >
        {score}
      </span>
      <span
        style={{ fontFamily: "'Inter', sans-serif" }}
        className="text-[11px] text-slate-400 font-medium"
      >
        /100
      </span>
    </span>
  );
}

// Desktop row (hidden on mobile)
function DecisionRowDesktop({ d }: { d: Decision }) {
  const inner = (
    <div className="flex items-center justify-between py-5 group">
      <div className="flex items-start gap-5 flex-1 min-w-0">
        <span
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[12px] text-slate-400 font-medium whitespace-nowrap pt-[2px] w-[44px] shrink-0"
        >
          {d.date}
        </span>
        <div className="shrink-0 pt-[1px]">
          <ActionChip label={d.action} color={d.actionColor} />
        </div>
        <span
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className="text-[14px] font-bold text-slate-900 shrink-0 pt-[1px] w-[44px]"
        >
          {d.ticker}
        </span>
        <p
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[14px] text-slate-600 leading-snug truncate group-hover:text-slate-800 transition-colors"
        >
          {d.rationale}
        </p>
      </div>
      <div className="shrink-0 ml-8">
        <ScoreControl score={d.score} variant={d.scoreVariant} />
      </div>
    </div>
  );

  if (d.href) {
    return (
      <Link to={d.href} className="block cursor-pointer hover:bg-slate-50 -mx-4 px-4 rounded-[8px] transition-colors">
        {inner}
      </Link>
    );
  }
  return <div className="cursor-default">{inner}</div>;
}

// Mobile card
function DecisionCardMobile({ d }: { d: Decision }) {
  const inner = (
    <div className="bg-white rounded-[12px] border border-slate-100 px-[14px] py-[13px] flex items-start justify-between gap-[10px] active:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        {/* Top row: chip + ticker */}
        <div className="flex items-center gap-[7px] mb-[6px]">
          <ActionChip label={d.action} color={d.actionColor} />
          <span
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            className="text-[13px] font-bold text-slate-900"
          >
            {d.ticker}
          </span>
          <span
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[11px] text-slate-400 ml-auto shrink-0"
          >
            {d.date}
          </span>
        </div>
        {/* Rationale */}
        <p
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[13px] text-slate-600 leading-snug line-clamp-2"
        >
          {d.rationale}
        </p>
      </div>
      {/* Score */}
      <div className="shrink-0 pl-[6px] flex items-center">
        <ScoreControl score={d.score} variant={d.scoreVariant} />
      </div>
    </div>
  );

  if (d.href) {
    return (
      <Link to={d.href} className="block cursor-pointer">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

function RecentDecisions() {
  return (
    <section className="w-full py-8 md:py-12">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8">
        <div className="flex items-baseline justify-between mb-1">
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[20px] md:text-[24px] font-bold text-slate-900"
          >
            Recent Decisions
          </h2>
          <button
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[12px] md:text-[13px] text-blue-600 font-medium hover:underline"
          >
            View all
          </button>
        </div>

        {/* Mobile: card stack */}
        <div className="flex flex-col gap-[8px] mt-4 md:hidden">
          {DECISIONS.map((d, i) => (
            <DecisionCardMobile key={i} d={d} />
          ))}
        </div>

        {/* Desktop: table rows */}
        <div className="hidden md:block mt-1 divide-y divide-slate-100">
          {DECISIONS.map((d, i) => (
            <DecisionRowDesktop key={i} d={d} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Needs Your Judgment ──────────────────────────────────────────────────────

type JudgmentItem = {
  id: number;
  dotColor: string;
  title: string;
  teaser: string;
  detail: string;
  actionLabel: string;
};

const JUDGMENT_ITEMS: JudgmentItem[] = [
  {
    id: 1,
    dotColor: "bg-amber-400",
    title: "Review NVDA growth assumption",
    teaser: "AI CapEx slowed; your DCF still assumes 30% FCF growth.",
    detail:
      "Your original thesis modeled 30% free-cash-flow growth through FY2027, anchored to hyperscaler CapEx acceleration. Three major cloud providers have since signaled CapEx moderation. The implied growth rate embedded in current prices may now exceed what the data supports. Your judgment is needed before this position grows further.",
    actionLabel: "Review DCF",
  },
  {
    id: 2,
    dotColor: "bg-blue-400",
    title: "GOOGL 10-K filed",
    teaser: "New annual filing — your thesis has two open questions.",
    detail: "",
    actionLabel: "Review thesis",
  },
  {
    id: 3,
    dotColor: "bg-slate-300",
    title: "MSFT exit — outcome review",
    teaser: "You sold MSFT at $385. It's now $412. Was the call right?",
    detail: "",
    actionLabel: "Review decision",
  },
];

function JudgmentAccordion() {
  const [openId, setOpenId] = useState<number | null>(1);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = JUDGMENT_ITEMS.filter(item => !dismissed.has(item.id));

  return (
    <section className="w-full py-8 md:py-12 bg-slate-50 border-y border-slate-100">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8">
        <div className="mb-4 md:mb-6">
          <h2
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[20px] md:text-[24px] font-bold text-slate-900"
          >
            Needs your judgment
          </h2>
          <p
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[12px] md:text-[13px] text-slate-400 mt-1"
          >
            Open loops for you to decide.
          </p>
        </div>

        <div className="flex flex-col gap-[6px] md:gap-[2px]">
          {visible.map(item => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-[12px] md:rounded-[10px] border border-slate-100 overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-[14px] md:py-4 cursor-pointer select-none"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                >
                  <div className={`size-2 rounded-full shrink-0 ${item.dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <span
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[13px] md:text-[14px] font-semibold text-slate-800 block leading-snug"
                    >
                      {item.title}
                    </span>
                    {!isOpen && (
                      <span
                        style={{ fontFamily: "'Inter', sans-serif" }}
                        className="text-[12px] md:text-[13px] text-slate-400 truncate block mt-[2px]"
                      >
                        {item.teaser}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronIcon open={isOpen} />
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDismissed(prev => new Set([...prev, item.id]));
                        if (openId === item.id) setOpenId(null);
                      }}
                      className="hover:opacity-100 text-slate-300 hover:text-slate-500 transition-opacity p-1"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-slate-100">
                    <p
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[12px] md:text-[13px] text-slate-500 leading-[1.65] mt-3 md:mt-4 mb-4 md:mb-5"
                    >
                      {item.detail || item.teaser}
                    </p>
                    <button
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      className="text-[12px] md:text-[13px] font-semibold text-blue-600 border border-blue-200 rounded-[8px] md:rounded-[6px] px-4 py-[8px] md:py-[7px] hover:bg-blue-50 transition-colors"
                    >
                      {item.actionLabel} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Watch List ───────────────────────────────────────────────────────────────

type WatchRow = {
  ticker: string;
  closePrice: string;
  fairValue: string;
  changePercent: number;
  href?: string;
};

const WATCH_ROWS: WatchRow[] = [
  { ticker: "AAPL",  closePrice: "$201.32", fairValue: "$225.00", changePercent:  8.51, href: "/transaction/aapl" },
  { ticker: "GOOGL", closePrice: "$178.64", fairValue: "$195.00", changePercent:  9.16 },
  { ticker: "NVDA",  closePrice: "$131.48", fairValue: "$120.00", changePercent: -8.74 },
];

// Desktop: 4-column grid (same as before)
const watchGridCols = "grid-cols-[96px_1fr_1fr_100px]";

function WatchRowCells({ row }: { row: WatchRow }) {
  const isUp = row.changePercent >= 0;
  return (
    <>
      <span
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className="text-[15px] font-bold text-slate-900"
      >
        {row.ticker}
      </span>
      <span
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className="text-[14px] tabular-nums text-slate-700"
      >
        {row.closePrice}
      </span>
      <span
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className="text-[14px] tabular-nums text-slate-500"
      >
        {row.fairValue}
      </span>
      <span
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
        className={`text-[14px] font-semibold tabular-nums text-right ${isUp ? "text-emerald-600" : "text-red-500"}`}
      >
        {isUp ? "▲" : "▼"} {Math.abs(row.changePercent).toFixed(2)}%
      </span>
    </>
  );
}

// Mobile watch card — two rows of info
function WatchCardMobile({ row }: { row: WatchRow }) {
  const isUp = row.changePercent >= 0;

  const inner = (
    <div className="flex items-center justify-between px-[14px] py-[13px] bg-white rounded-[12px] border border-slate-100 active:bg-slate-50 transition-colors">
      {/* Left: ticker + price */}
      <div className="flex flex-col gap-[4px]">
        <span
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className="text-[15px] font-bold text-slate-900 leading-none"
        >
          {row.ticker}
        </span>
        <div className="flex items-baseline gap-[6px]">
          <span
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            className="text-[13px] tabular-nums text-slate-600"
          >
            {row.closePrice}
          </span>
          <span
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[10px] text-slate-400"
          >
            close
          </span>
        </div>
      </div>

      {/* Center: fair value */}
      <div className="flex flex-col items-center gap-[4px]">
        <span
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[9px] font-bold text-slate-400 uppercase tracking-wide"
        >
          Fair Value
        </span>
        <span
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className="text-[13px] font-semibold tabular-nums text-slate-700"
        >
          {row.fairValue}
        </span>
      </div>

      {/* Right: change */}
      <div className="flex flex-col items-end gap-[4px]">
        <span
          style={{ fontFamily: "'Inter', sans-serif" }}
          className="text-[9px] font-bold text-slate-400 uppercase tracking-wide"
        >
          MOS
        </span>
        <span
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          className={`text-[16px] font-bold tabular-nums ${isUp ? "text-emerald-600" : "text-red-500"}`}
        >
          {isUp ? "▲" : "▼"}{Math.abs(row.changePercent).toFixed(1)}%
        </span>
      </div>
    </div>
  );

  if (row.href) {
    return (
      <Link to={row.href} className="block cursor-pointer">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

function WatchList() {
  const [query, setQuery] = useState("");

  const filtered = WATCH_ROWS.filter(
    r => r.ticker.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <section className="w-full py-8 md:py-12">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between gap-4 mb-4 md:mb-5 flex-wrap">
          <div>
            <h2
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-[20px] md:text-[24px] font-bold text-slate-900"
            >
              Watch List
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] md:text-[13px] text-slate-400 mt-1">
              Your tracked positions at a glance.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-[260px]">
            <div className="absolute left-[11px] top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon size={15} />
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search ticker…"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              className="w-full h-[38px] pl-[34px] pr-[10px] bg-white border border-slate-200 rounded-[9px] text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile: stacked cards */}
        <div className="flex flex-col gap-[8px] md:hidden">
          {filtered.length === 0 && (
            <p style={{ fontFamily: "'Inter', sans-serif" }}
              className="text-[13px] text-slate-400 text-center py-6">
              No tickers match "{query}"
            </p>
          )}
          {filtered.map(row => (
            <WatchCardMobile key={row.ticker} row={row} />
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
          <div
            style={{ fontFamily: "'Inter', sans-serif" }}
            className={`grid ${watchGridCols} gap-4 pb-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em]`}
          >
            <span>Ticker</span>
            <span>Close Price</span>
            <span>My Fair Value</span>
            <span className="text-right">% Change</span>
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <p style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[13px] text-slate-400 py-6">
                No tickers match "{query}"
              </p>
            )}
            {filtered.map(row =>
              row.href ? (
                <Link
                  key={row.ticker}
                  to={row.href}
                  className={`grid ${watchGridCols} gap-4 py-4 items-center group cursor-pointer hover:bg-slate-50 -mx-3 px-3 rounded-[8px] transition-colors`}
                >
                  <WatchRowCells row={row} />
                </Link>
              ) : (
                <div key={row.ticker} className={`grid ${watchGridCols} gap-4 py-4 items-center`}>
                  <WatchRowCells row={row} />
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-slate-100 py-6 md:py-8">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center md:justify-between gap-[6px] md:gap-0 text-center md:text-left">
        <span
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[13px] text-slate-400 font-normal italic"
        >
          MyStockJournal
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif" }} className="text-[12px] text-slate-300">
          Record decisions. Get rated. Stay honest.
        </span>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <TopNav />
      <main>
        <WatchList />
        <RecentDecisions />
        <JudgmentAccordion />
      </main>
      <Footer />
    </div>
  );
}
