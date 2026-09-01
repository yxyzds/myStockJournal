"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AAPL_LIVE,
  journalSeedFor,
  transactionsFor,
  type MockDecision,
  type MockTxn,
} from "@/lib/mock-journal";

type JournalEntry = { id: number; date: string; text: string; snapshot?: { price: string; pe: string } };

const VALUATION_METHODS = [
  { id: "pe", label: "P/E Band", value: "$225", note: "Preferred · Aug 20" },
  { id: "dcf", label: "DCF", value: "$235", note: "Base case · Aug 12" },
  { id: "evebitda", label: "EV/EBITDA", value: "$210", note: "" },
  { id: "sotp", label: "SOTP", value: "$247", note: "" },
  { id: "rdcf", label: "Reverse DCF", value: "—", note: "Market implies 9.5% growth" },
];

const EVENTS = [
  {
    color: "#f59e0b",
    title: "Review NVDA growth assumption",
    teaser: "AI CapEx slowed; your DCF still assumes 30% FCF growth.",
    badge: "Action needed",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  {
    color: "#3b82f6",
    title: "GOOGL 10-K filed",
    teaser: "New annual filing — your thesis has two open questions.",
    badge: "Review",
    badgeClass: "bg-blue-50 text-blue-700",
  },
  {
    color: "#94a3b8",
    title: "MSFT exit — outcome review",
    teaser: "You sold MSFT at $385. It's now $412. Was the call right?",
    badge: "Reflect",
    badgeClass: "bg-slate-100 text-slate-600",
  },
];

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3 3.5l.7 7.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L11 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function JournalEntryCard({
  entry,
  index,
  onDelete,
}: {
  entry: JournalEntry;
  index: number;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = entry.text.length > 280;
  const displayed = long && !expanded ? `${entry.text.slice(0, 280).trimEnd()}…` : entry.text;

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#e8eef5] bg-white shadow-[0_1px_4px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-[#ebf0f5] bg-slate-50 px-4 py-3 md:px-[18px]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span className="truncate text-[13px] font-semibold text-slate-800">{entry.date}</span>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
          aria-label="Delete entry"
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="px-4 pt-3.5 pb-3 md:px-[18px]">
        <p className="text-[14px] leading-[1.7] whitespace-pre-wrap text-slate-700">{displayed}</p>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[12px] font-semibold text-blue-600 hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      {entry.snapshot && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#ebf0f5] bg-slate-50 px-4 py-2.5 md:gap-3 md:px-[18px]">
          <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">At entry</span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">{entry.snapshot.price}</span>
          <span className="text-[11px] text-slate-300">·</span>
          <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Fwd P/E</span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">{entry.snapshot.pe}</span>
        </div>
      )}
    </div>
  );
}

function NewEntryComposer({ ticker, onSave }: { ticker: string; onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const hasText = text.trim().length > 0;
  const words = hasText ? text.trim().split(/\s+/).length : 0;

  return (
    <div
      className={`overflow-hidden rounded-[14px] border transition-all ${
        focused ? "border-blue-600 shadow-[0_0_0_3px_#eff6ff]" : "border-[#e8eef5]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#ebf0f5] bg-slate-50 px-3 py-2 md:px-4">
        <div className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-slate-600">New entry</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[11px] tabular-nums text-slate-600">
          <span className="hidden text-[10px] font-bold tracking-wide text-slate-400 uppercase sm:inline">Today</span>
          <span className="truncate">
            {ticker} {AAPL_LIVE.price}
          </span>
          <span className="text-slate-300">·</span>
          <span className="hidden sm:inline">Fwd P/E {AAPL_LIVE.pe}</span>
          <span className="sm:hidden">{AAPL_LIVE.pe}</span>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="What's your thesis? What are you watching? What would change your mind?"
        rows={4}
        className="w-full resize-none border-0 bg-white px-4 pt-3.5 pb-2.5 text-[14px] leading-[1.7] text-slate-700 outline-none placeholder:text-slate-300 md:px-[18px]"
      />
      <div className="flex items-center justify-between gap-2 border-t border-[#ebf0f5] bg-slate-50 px-3 py-2.5 md:px-4">
        <span className="min-w-0 truncate text-[11px] text-slate-300">
          {hasText ? `${words} word${words === 1 ? "" : "s"}` : "Snapshots price & P/E on save"}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasText && (
            <button
              type="button"
              onClick={() => setText("")}
              className="rounded-md px-2.5 py-1 text-[12px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            disabled={!hasText}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!hasText) return;
              onSave(text.trim());
              setText("");
            }}
            className={`flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[12px] font-semibold ${
              hasText ? "bg-slate-900 text-white" : "cursor-not-allowed bg-slate-100 text-slate-300"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M1.5 6h9M7 2.5l3.5 3.5L7 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Journal({ decision }: { decision: MockDecision }) {
  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: 1, date: `${decision.dateLabel}, 2026`, text: journalSeedFor(decision), snapshot: AAPL_LIVE },
  ]);

  return (
    <section className="flex w-full flex-col gap-5 rounded-2xl border border-[#ebf0f5] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden className="shrink-0">
              <rect x="2" y="1" width="11" height="13" rx="2" stroke="#0f172a" strokeWidth="1.3" />
              <path d="M5 5h5M5 8h5M5 11h3" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="text-[16px] font-bold text-slate-800 md:text-[17px]">{decision.ticker} · Journal</p>
          </div>
          <p className="text-[12px] text-slate-400">Your investment thesis & decision record</p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
      </div>
      {entries.length > 0 && (
        <div className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              index={i}
              onDelete={() => setEntries((prev) => prev.filter((e) => e.id !== entry.id))}
            />
          ))}
        </div>
      )}
      <NewEntryComposer
        ticker={decision.ticker}
        onSave={(text) => {
          const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          setEntries((prev) => [...prev, { id: Date.now(), date: today, text, snapshot: AAPL_LIVE }]);
        }}
      />
    </section>
  );
}

function ValuationDropdown() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("pe");
  const ref = useRef<HTMLDivElement>(null);
  const selected = VALUATION_METHODS.find((m) => m.id === selectedId)!;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg bg-[#f4f6f9] px-3 py-1.5 hover:bg-[#ebf0f5]"
      >
        <span className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">REF:</span>
        <span className="text-[10px] font-bold text-blue-600 uppercase">
          {selected.label} ({selected.value})
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-20 min-w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#ebf0f5] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.10)]">
          {VALUATION_METHODS.map((m) => {
            const isSelected = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedId(m.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${
                  isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex size-3.5 items-center justify-center rounded-full border-[1.5px] ${
                      isSelected ? "border-blue-600" : "border-slate-400"
                    }`}
                  >
                    {isSelected && <span className="size-1.5 rounded-full bg-blue-600" />}
                  </span>
                  <span className={`text-[13px] ${isSelected ? "font-semibold text-blue-600" : "text-slate-600"}`}>
                    {m.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.value !== "—" && (
                    <span className={`text-[13px] font-bold ${isSelected ? "text-blue-600" : "text-slate-800"}`}>
                      {m.value}
                    </span>
                  )}
                  {m.note && <span className="hidden text-[11px] text-slate-400 sm:inline">{m.note}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TxnRecord({ txn }: { txn: MockTxn }) {
  const isBuy = txn.side === "buy";
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        isBuy ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
      }`}
    >
      <span
        className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
          isBuy ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }`}
      >
        Transaction · {isBuy ? "Buy" : "Sell"}
      </span>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["PRICE", txn.price],
          ["QUANTITY", txn.qty],
          ["DATE", txn.date.replace(", 2026", "")],
        ].map(([label, val]) => (
          <div key={label} className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase md:text-[11px]">{label}</p>
            <p
              className={`mt-1 truncate font-mono text-[13px] font-bold md:text-base ${
                isBuy ? "text-slate-800" : "text-rose-700"
              }`}
            >
              {val}
            </p>
          </div>
        ))}
      </div>
      <div className={`border-t pt-3 ${isBuy ? "border-emerald-200" : "border-rose-200"}`}>
        <p className={`mb-1 text-[11px] font-bold uppercase ${isBuy ? "text-slate-400" : "text-rose-300"}`}>Reason</p>
        <p className={`text-[13px] leading-relaxed ${isBuy ? "text-slate-600" : "text-rose-700"}`}>{txn.reason}</p>
      </div>
    </div>
  );
}

function DraftRecord() {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border-2 border-dashed border-blue-600 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-blue-600 uppercase">
          Editing · New record
        </span>
        <div className="flex gap-1.5">
          <button type="button" className="rounded-md bg-[#f4f6f9] px-3 py-1.5 text-[12px] font-semibold text-slate-600">
            Cancel
          </button>
          <button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white">
            Save
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${
            side === "buy" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 opacity-50"
          }`}
        >
          + Buy
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
            side === "sell" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500 opacity-50"
          }`}
        >
          − Sell
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ["PRICE", price, setPrice, "$—"],
            ["QUANTITY", qty, setQty, "0 shares"],
            ["DATE", date, setDate, "Select date"],
          ] as const
        ).map(([label, value, setValue, placeholder], i) => (
          <label key={label} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">{label}</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className={`w-full rounded-lg px-3 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400 ${
                i === 0 ? "border-2 border-blue-600" : "border border-[#ebf0f5] bg-[#f4f6f9]"
              }`}
            />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase">Reason</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe why you're making this trade…"
          rows={3}
          className="w-full resize-none rounded-lg border border-[#ebf0f5] bg-[#f4f6f9] px-3 py-2.5 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>
    </div>
  );
}

function TransactionCard({ decision }: { decision: MockDecision }) {
  const [open, setOpen] = useState(true);
  const txns = transactionsFor(decision);
  const hasBuy = txns.some((t) => t.side === "buy");
  const hasSell = txns.some((t) => t.side === "sell");

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ebf0f5] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left md:px-6 md:py-5"
      >
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-slate-800 md:text-lg">Transaction</p>
          <p className="text-[12px] text-slate-500">Attached to this entry</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!open && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {hasBuy && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                  Buy
                </span>
              )}
              {hasSell && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                  Sell
                </span>
              )}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase">
                Draft
              </span>
            </div>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M4 6L8 10L12 6" stroke="#8A99AD" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-4 border-t border-[#ebf0f5] px-4 pt-4 pb-5 md:px-6 md:pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[13px] font-bold text-emerald-800">+ Buy</span>
            <span className="rounded-lg bg-rose-100 px-3 py-1.5 text-[13px] font-semibold text-rose-800 opacity-60">
              − Sell
            </span>
            <ValuationDropdown />
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold tracking-wide text-white uppercase"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M6 2v8M2 6h8" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              Set Valuation
            </button>
          </div>
          {txns.map((txn) => (
            <TxnRecord key={`${txn.side}-${txn.date}`} txn={txn} />
          ))}
          <DraftRecord />
        </div>
      )}
    </section>
  );
}

function EventsCard() {
  return (
    <section className="rounded-2xl border border-[#ebf0f5] bg-white p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
          <path
            d="M7 1.5v1M7 11.5v1M2.05 4l.87.5M11.08 9.5l.87.5M2.05 10l.87-.5M11.08 4.5l.87-.5M1.5 7h1M11.5 7h1"
            stroke="#f59e0b"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="7" cy="7" r="2.5" stroke="#f59e0b" strokeWidth="1.3" />
        </svg>
        <p className="text-[16px] font-bold text-slate-800">Important Events</p>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
          Needs judgment
        </span>
      </div>
      <div className="flex flex-col">
        {EVENTS.map((evt) => (
          <div key={evt.title} className="flex items-start gap-3 rounded-[10px] px-2 py-3 hover:bg-slate-50 md:px-3">
            <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: evt.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{evt.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{evt.teaser}</p>
            </div>
            <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${evt.badgeClass}`}>
              {evt.badge}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoringCard({ decision }: { decision: MockDecision }) {
  const unscored = decision.scoreVariant === "none" || decision.score == null;
  const value = decision.score ?? 78;
  const [rated, setRated] = useState(!unscored);

  return (
    <aside className="flex flex-col items-center gap-5 rounded-2xl border border-[#ebf0f5] bg-white p-5 md:sticky md:top-20 md:gap-6 md:p-6">
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M7 1.2l1.5 3.1 3.4.5-2.45 2.4.58 3.38L7 9.02 3.97 10.58l.58-3.38L2.1 4.8l3.4-.5L7 1.2z"
            stroke="#2563EB"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[12px] font-bold tracking-wide text-blue-600 uppercase">Rate My Transaction</p>
      </div>
      {rated ? (
        <>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-5xl font-extrabold text-slate-800 md:text-[56px]">{value}</span>
            <span className="text-xl text-slate-400">/ 100</span>
          </div>
          <p className="text-center text-[13px] text-slate-500">
            {decision.scoreVariant === "weak"
              ? "Thesis is thin — the dip may have been the only reason."
              : "Strong reasoning, one mild gap in evidence."}
          </p>
          <div className="flex w-full flex-col gap-2 text-[13px]">
            <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Breakdown</p>
            {(
              [
                ["Valuation", "86"],
                ["Thesis Alignment", "81"],
                ["Evidence", "50"],
                ["Risk Management", "73"],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-500">{k}</span>
                <span
                  className={
                    v === "50" ? "rounded bg-amber-700 px-2 py-0.5 text-[11px] font-bold text-white" : "font-bold text-slate-800"
                  }
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-extrabold tracking-wide text-amber-700 uppercase">AI Challenge</p>
            <p className="mt-2 text-[13px] leading-relaxed text-amber-700">
              Your growth assumption sits above the 5Y average. What evidence would justify it?
            </p>
          </div>
        </>
      ) : (
        <p className="text-center text-[13px] text-slate-500">
          Score this decision. AI will challenge your assumptions — not tell you what to buy.
        </p>
      )}
      <button
        type="button"
        onClick={() => setRated(true)}
        className="flex size-[88px] items-center justify-center rounded-full bg-blue-600 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(37,99,235,0.25)] md:size-[100px]"
      >
        Rate
      </button>
      <p className="text-center text-[12px] font-semibold text-blue-600">What would change this score?</p>
    </aside>
  );
}

export function DecisionDetail({ decision }: { decision: MockDecision }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-[max(3rem,env(safe-area-inset-bottom))] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#ebf0f5] bg-white pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-3 md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f6f9] hover:bg-[#ebf0f5]"
              aria-label="Back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 13L5 8l5-5" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-mono text-[16px] font-bold text-slate-900 md:text-lg">{decision.ticker}</p>
                <span className="hidden h-4 w-px bg-[#ebf0f5] md:block" />
                <p className="hidden truncate text-[14px] text-slate-500 md:inline">{decision.name}</p>
              </div>
              <p className="truncate text-[12px] text-slate-500 md:hidden">
                {decision.dateLabel ? `${decision.name} · ${decision.dateLabel}` : decision.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {decision.dateLabel ? (
              <span className="hidden text-[14px] text-slate-500 md:inline">{decision.dateLabel}, 2026</span>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-[#ebf0f5] bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-800 md:px-4"
            >
              Edit
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-4 px-3 py-4 md:gap-6 md:px-6 md:py-6 lg:grid-cols-[minmax(0,1fr)_348px] lg:grid-rows-[auto_auto_auto] lg:items-start">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Journal decision={decision} />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <ScoringCard decision={decision} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <TransactionCard decision={decision} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-3">
          <EventsCard />
        </div>
      </div>
    </div>
  );
}

export function DecisionNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-4">
      <p className="font-heading text-xl font-bold">Decision not found</p>
      <Link href="/" className="text-sm font-medium text-blue-600">
        Back to journal
      </Link>
    </div>
  );
}
