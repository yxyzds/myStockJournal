"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountAvatar } from "@/components/account-avatar";
import { NavLocaleToggle } from "@/components/language-switcher";
import { useI18n, type Translate } from "@/i18n";
import { formatEntryDate, formatShortDate, todayNyDate } from "@/lib/format";
import {
  AAPL_LIVE,
  journalSeedFor,
  transactionsFor,
  type MockDecision,
  type MockTxn,
} from "@/lib/mock-journal";

type JournalEntry = { id: number; date: string; text: string; snapshot?: { price: string; pe: string } };

function valuationMethods(t: Translate) {
  return [
    { id: "pe", label: t("mock.peBand"), value: "$225", note: t("mock.preferred") },
    { id: "dcf", label: t("methods.dcf"), value: "$235", note: t("mock.baseCase") },
    { id: "evebitda", label: t("methods.evebitda"), value: "$210", note: "" },
    { id: "rdcf", label: t("methods.rdcf"), value: t("common.dash"), note: t("mock.marketImplies") },
  ];
}

function events(t: Translate) {
  return [
    {
      color: "#f59e0b",
      title: t("mock.eventNvdaTitle"),
      teaser: t("mock.eventNvdaTeaser"),
      badge: t("mock.badgeAction"),
      badgeClass: "bg-amber-50 text-amber-700",
    },
    {
      color: "#3b82f6",
      title: t("mock.eventGooglTitle"),
      teaser: t("mock.eventGooglTeaser"),
      badge: t("mock.badgeReview"),
      badgeClass: "bg-blue-50 text-blue-700",
    },
    {
      color: "#94a3b8",
      title: t("mock.eventMsftTitle"),
      teaser: t("mock.eventMsftTeaser"),
      badge: t("mock.badgeReflect"),
      badgeClass: "bg-slate-100 text-slate-600",
    },
  ];
}

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
  const { t } = useI18n();
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
          aria-label={t("journal.deleteAria")}
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
            {expanded ? t("journal.showLess") : t("journal.readMore")}
          </button>
        )}
      </div>
      {entry.snapshot && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#ebf0f5] bg-slate-50 px-4 py-2.5 md:gap-3 md:px-[18px]">
          <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{t("journal.atEntry")}</span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">{entry.snapshot.price}</span>
          <span className="text-[11px] text-slate-300">·</span>
          <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{t("journal.fwdPe")}</span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">{entry.snapshot.pe}</span>
        </div>
      )}
    </div>
  );
}

function NewEntryComposer({ ticker, onSave }: { ticker: string; onSave: (text: string) => void }) {
  const { t } = useI18n();
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
          <span className="text-[11px] font-semibold text-slate-600">{t("journal.newEntry")}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden font-mono text-[11px] tabular-nums text-slate-600">
          <span className="hidden text-[10px] font-bold tracking-wide text-slate-400 uppercase sm:inline">
            {t("journal.today")}
          </span>
          <span className="truncate">
            {ticker} {AAPL_LIVE.price}
          </span>
          <span className="text-slate-300">·</span>
          <span className="hidden sm:inline">
            {t("journal.fwdPe")} {AAPL_LIVE.pe}
          </span>
          <span className="sm:hidden">{AAPL_LIVE.pe}</span>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("journal.placeholder")}
        rows={4}
        className="w-full resize-none border-0 bg-white px-4 pt-3.5 pb-2.5 text-[14px] leading-[1.7] text-slate-700 outline-none placeholder:text-slate-300 md:px-[18px]"
      />
      <div className="flex items-center justify-between gap-2 border-t border-[#ebf0f5] bg-slate-50 px-3 py-2.5 md:px-4">
        <span className="min-w-0 truncate text-[11px] text-slate-300">
          {hasText
            ? words === 1
              ? t("journal.wordOne", { count: words })
              : t("journal.wordMany", { count: words })
            : t("mock.snapshotPe")}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasText && (
            <button
              type="button"
              onClick={() => setText("")}
              className="rounded-md px-2.5 py-1 text-[12px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              {t("journal.clear")}
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
            {t("journal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Journal({ decision }: { decision: MockDecision }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: 1, date: formatEntryDate(decision.date), text: journalSeedFor(decision), snapshot: AAPL_LIVE },
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
            <p className="text-[16px] font-bold text-slate-800 md:text-[17px]">
              {t("stock.journalTitle", { ticker: decision.ticker })}
            </p>
          </div>
          <p className="text-[12px] text-slate-400">{t("stock.journalSubtitle")}</p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
          {entries.length === 1
            ? t("stock.entryOne", { count: entries.length })
            : t("stock.entryMany", { count: entries.length })}
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
          const today = formatEntryDate(todayNyDate());
          setEntries((prev) => [...prev, { id: Date.now(), date: today, text, snapshot: AAPL_LIVE }]);
        }}
      />
    </section>
  );
}

function ValuationDropdown() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("pe");
  const ref = useRef<HTMLDivElement>(null);
  const methods = valuationMethods(t);
  const selected = methods.find((m) => m.id === selectedId)!;

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
        <span className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">{t("mock.ref")}</span>
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
          {methods.map((m) => {
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
                  {m.value !== t("common.dash") && (
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
  const { t } = useI18n();
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
        {t("transaction.label", { side: isBuy ? t("transaction.buy") : t("transaction.sell") })}
      </span>
      <div className="grid grid-cols-3 gap-2">
        {[
          [t("transaction.price"), txn.price],
          [t("transaction.quantity"), txn.qty],
          [t("transaction.date"), txn.date.replace(", 2026", "")],
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
        <p className={`mb-1 text-[11px] font-bold uppercase ${isBuy ? "text-slate-400" : "text-rose-300"}`}>
          {t("transaction.reason")}
        </p>
        <p className={`text-[13px] leading-relaxed ${isBuy ? "text-slate-600" : "text-rose-700"}`}>{txn.reason}</p>
      </div>
    </div>
  );
}

function DraftRecord() {
  const { t } = useI18n();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border-2 border-dashed border-blue-600 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-blue-600 uppercase">
          {t("transaction.editingNew")}
        </span>
        <div className="flex gap-1.5">
          <button type="button" className="rounded-md bg-[#f4f6f9] px-3 py-1.5 text-[12px] font-semibold text-slate-600">
            {t("common.cancel")}
          </button>
          <button type="button" className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white">
            {t("common.save")}
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
          {t("transaction.plusBuy")}
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
            side === "sell" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500 opacity-50"
          }`}
        >
          {t("transaction.minusSell")}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            [t("transaction.price"), price, setPrice, t("transaction.pricePlaceholder")],
            [t("transaction.quantity"), qty, setQty, t("transaction.qtyPlaceholder")],
            [t("transaction.date"), date, setDate, t("mock.selectDate")],
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
        <span className="text-[11px] font-bold text-slate-400 uppercase">{t("transaction.reason")}</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("transaction.reasonPlaceholder")}
          rows={3}
          className="w-full resize-none rounded-lg border border-[#ebf0f5] bg-[#f4f6f9] px-3 py-2.5 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>
    </div>
  );
}

function TransactionCard({ decision }: { decision: MockDecision }) {
  const { t } = useI18n();
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
          <p className="text-[16px] font-bold text-slate-800 md:text-lg">{t("stock.transaction")}</p>
          <p className="text-[12px] text-slate-500">{t("mock.attached")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!open && (
            <div className="hidden items-center gap-1.5 sm:flex">
              {hasBuy && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">
                  {t("transaction.buy")}
                </span>
              )}
              {hasSell && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                  {t("transaction.sell")}
                </span>
              )}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase">
                {t("mock.draft")}
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
            <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[13px] font-bold text-emerald-800">
              {t("transaction.plusBuy")}
            </span>
            <span className="rounded-lg bg-rose-100 px-3 py-1.5 text-[13px] font-semibold text-rose-800 opacity-60">
              {t("transaction.minusSell")}
            </span>
            <ValuationDropdown />
            <button
              type="button"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold tracking-wide text-white uppercase"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M6 2v8M2 6h8" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              {t("mock.setValuation")}
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
  const { t } = useI18n();
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
        <p className="text-[16px] font-bold text-slate-800">{t("mock.importantEvents")}</p>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
          {t("mock.needsJudgment")}
        </span>
      </div>
      <div className="flex flex-col">
        {events(t).map((evt) => (
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
  const { t } = useI18n();
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
        <p className="text-[12px] font-bold tracking-wide text-blue-600 uppercase">{t("transaction.rateTitle")}</p>
      </div>
      {rated ? (
        <>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-5xl font-extrabold text-slate-800 md:text-[56px]">{value}</span>
            <span className="text-xl text-slate-400">{t("mock.outOf100")}</span>
          </div>
          <p className="text-center text-[13px] text-slate-500">
            {decision.scoreVariant === "weak" ? t("mock.scoreWeak") : t("mock.scoreStrong")}
          </p>
          <div className="flex w-full flex-col gap-2 text-[13px]">
            <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{t("mock.breakdown")}</p>
            {(
              [
                [t("mock.breakdownValuation"), "86"],
                [t("mock.breakdownThesis"), "81"],
                [t("mock.breakdownEvidence"), "50"],
                [t("mock.breakdownRisk"), "73"],
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
            <p className="text-[10px] font-extrabold tracking-wide text-amber-700 uppercase">{t("mock.aiChallenge")}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-amber-700">{t("mock.aiChallengeBody")}</p>
          </div>
        </>
      ) : (
        <p className="text-center text-[13px] text-slate-500">{t("mock.scorePrompt")}</p>
      )}
      <button
        type="button"
        onClick={() => setRated(true)}
        className="flex size-[88px] items-center justify-center rounded-full bg-blue-600 text-[15px] font-bold text-white shadow-[0_8px_16px_rgba(37,99,235,0.25)] md:size-[100px]"
      >
        {t("mock.rateCta")}
      </button>
      <p className="text-center text-[12px] font-semibold text-blue-600">{t("mock.whatWouldChange")}</p>
    </aside>
  );
}

export function DecisionDetail({ decision }: { decision: MockDecision }) {
  const { t } = useI18n();
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
              aria-label={t("common.back")}
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
                {decision.dateLabel ? `${decision.name} · ${formatShortDate(decision.date)}` : decision.name}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {decision.dateLabel ? (
              <span className="hidden text-[14px] text-slate-500 md:inline">{formatEntryDate(decision.date)}</span>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-[#ebf0f5] bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-800 md:px-4"
            >
              {t("mock.edit")}
            </button>
            <NavLocaleToggle />
            <AccountAvatar />
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
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-4">
      <p className="font-heading text-xl font-bold">{t("mock.notFoundTitle")}</p>
      <Link href="/" className="text-sm font-medium text-blue-600">
        {t("mock.backToJournal")}
      </Link>
    </div>
  );
}
