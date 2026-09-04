"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  METHOD_LABELS as VALUATION_METHOD_LABELS,
  fairValueFromOutputs,
  type JournalEntry,
  type StockDetail,
  type StockTransaction,
  type ValuationMethod,
  type ValuationWorkbench,
} from "@mystockjournal/shared";
import { api } from "@/lib/api";
import { formatEntryDate, formatPrice, isCalendarDate, todayNyDate } from "@/lib/format";
import { JUDGMENT_ITEMS } from "@/lib/mock-journal";

function parseMoney(raw: string) {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseQty(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

type TxnFormErrors = {
  price?: string;
  qty?: string;
  date?: string;
  rationale?: string;
};

function validateTxnForm(input: { price: string; qty: string; date: string; rationale: string }): TxnFormErrors {
  const errors: TxnFormErrors = {};
  const price = parseMoney(input.price);
  if (price == null || price <= 0) errors.price = "Enter a price greater than 0";
  const qty = parseQty(input.qty);
  if (qty == null || qty <= 0) errors.qty = "Enter a share quantity greater than 0";
  if (!isCalendarDate(input.date)) errors.date = "Pick a valid date";
  else if (input.date > todayNyDate()) errors.date = "Date can’t be in the future";
  if (!input.rationale.trim()) errors.rationale = "Write a reason for this trade";
  return errors;
}

function fieldClass(invalid: boolean, emphasized = false) {
  if (invalid) {
    return "w-full rounded-lg border-2 border-red-400 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none";
  }
  if (emphasized) {
    return "w-full rounded-lg border-2 border-blue-600 bg-white px-3 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400";
  }
  return "w-full rounded-lg border border-[#ebf0f5] bg-[#f4f6f9] px-3 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400";
}

function FieldHint({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] font-medium text-red-500">{message}</p>;
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

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M8.2 2.3 11.7 5.8 5 12.5H1.5V9zM7.4 3.1l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function JournalCard({
  entry,
  index,
  onDelete,
  onSave,
}: {
  entry: JournalEntry;
  index: number;
  onDelete: () => void;
  onSave: (text: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const long = entry.text.length > 280;
  const displayed = long && !expanded ? `${entry.text.slice(0, 280).trimEnd()}…` : entry.text;
  const canSave = draft.trim().length > 0 && draft.trim() !== entry.text && !saving;

  function startEdit() {
    setDraft(entry.text);
    setEditing(true);
  }

  async function saveEdit() {
    const text = draft.trim();
    if (!text || saving) return;
    if (text === entry.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(text);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-[14px] border bg-white shadow-[0_1px_4px_rgba(15,23,42,0.05)] ${
        editing ? "border-blue-600 shadow-[0_0_0_3px_#eff6ff]" : "border-[#e8eef5]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[#ebf0f5] bg-slate-50 px-4 py-3 md:px-[18px]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
            {index + 1}
          </span>
          <span className="truncate text-[13px] font-semibold text-slate-800">{formatEntryDate(entry.date)}</span>
        </div>
        {editing ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDraft(entry.text);
                setEditing(false);
              }}
              className="rounded-md bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void saveEdit()}
              className="rounded-md bg-slate-900 px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Edit entry"
              onClick={startEdit}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
              aria-label="Delete entry"
              onClick={onDelete}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          autoFocus
          className="w-full resize-none border-0 bg-white px-4 pt-3.5 pb-3 text-[14px] leading-[1.7] text-slate-700 outline-none md:px-[18px]"
        />
      ) : (
        <div className="px-4 pt-3.5 pb-3 md:px-[18px]">
          <p
            className="cursor-text text-[14px] leading-[1.7] whitespace-pre-wrap text-slate-700"
            onClick={startEdit}
          >
            {displayed}
          </p>
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
      )}
      {entry.snapshot && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#ebf0f5] bg-slate-50 px-4 py-2.5 md:gap-3 md:px-[18px]">
          <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">At entry</span>
          <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">
            {formatPrice(entry.snapshot.price, entry.snapshot.currency)}
          </span>
          {entry.snapshot.pe && (
            <>
              <span className="text-[11px] text-slate-300">·</span>
              <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Fwd P/E</span>
              <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-600">
                {entry.snapshot.pe}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NewEntryComposer({
  ticker,
  priceLabel,
  peLabel,
  pending,
  onSave,
}: {
  ticker: string;
  priceLabel: string;
  peLabel: string | null;
  pending: boolean;
  onSave: (text: string) => void;
}) {
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
            {ticker} {priceLabel}
          </span>
          {peLabel && (
            <>
              <span className="text-slate-300">·</span>
              <span className="hidden sm:inline">Fwd P/E {peLabel}</span>
            </>
          )}
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
          {hasText ? `${words} word${words === 1 ? "" : "s"}` : "Snapshots price on save"}
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
            disabled={!hasText || pending}
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
            Save entry
          </button>
        </div>
      </div>
    </div>
  );
}

function txnFormValues(txn: StockTransaction) {
  return {
    price: txn.price == null ? "" : txn.price.toFixed(2),
    qty: txn.qty == null ? "" : String(txn.qty),
    date: txn.date,
    rationale: txn.rationale,
  };
}

function SavedTransaction({ txn, onEdit }: { txn: StockTransaction; onEdit: () => void }) {
  const isBuy = txn.type === "buy";
  return (
    <div
      className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 ${
        isBuy ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
            isBuy ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}
        >
          Transaction · {isBuy ? "Buy" : "Sell"}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md p-1.5 text-slate-300 hover:bg-white/70 hover:text-slate-600"
          aria-label="Edit transaction"
        >
          <PencilIcon />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["PRICE", formatPrice(txn.price)],
          ["QUANTITY", txn.qty == null ? "—" : `${txn.qty} shares`],
          ["DATE", formatEntryDate(txn.date).replace(", 2026", "")],
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
        <p className={`text-[13px] leading-relaxed ${isBuy ? "text-slate-600" : "text-rose-700"}`}>{txn.rationale}</p>
      </div>
    </div>
  );
}

function EditingTransactionForm({
  side,
  pending,
  title,
  initial,
  onSideChange,
  onCancel,
  onSave,
}: {
  side: "buy" | "sell";
  pending: boolean;
  title: string;
  initial?: { price: string; qty: string; date: string; rationale: string };
  onSideChange: (side: "buy" | "sell") => void;
  onCancel: () => void;
  onSave: (input: { type: "buy" | "sell"; price: string; qty: string; date: string; rationale: string }) => void;
}) {
  const [price, setPrice] = useState(initial?.price ?? "");
  const [qty, setQty] = useState(initial?.qty ?? "");
  const [date, setDate] = useState(initial?.date || todayNyDate());
  const [reason, setReason] = useState(initial?.rationale ?? "");
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateTxnForm({ price, qty, date, rationale: reason });
  const today = todayNyDate();

  function submit() {
    if (pending) return;
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    onSave({ type: side, price, qty, date, rationale: reason.trim() });
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border-2 border-dashed border-blue-600 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold tracking-wide text-blue-600 uppercase">
          {title}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-md bg-[#f4f6f9] px-3 py-1.5 text-[12px] font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSideChange("buy")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-bold ${
            side === "buy" ? "bg-[#def7ec] text-[#03543f]" : "bg-[#f4f6f9] text-slate-600 opacity-50"
          }`}
        >
          + Buy
        </button>
        <button
          type="button"
          onClick={() => onSideChange("sell")}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
            side === "sell" ? "bg-[#fde8e8] text-[#9b1c1c]" : "bg-[#f4f6f9] text-slate-600 opacity-50"
          }`}
        >
          − Sell
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Price</span>
          <input
            value={price}
            inputMode="decimal"
            autoComplete="off"
            placeholder="$—"
            onChange={(e) => setPrice(e.target.value)}
            className={fieldClass(showErrors && !!errors.price, true)}
          />
          {showErrors && <FieldHint message={errors.price} />}
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Quantity</span>
          <input
            value={qty}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0 shares"
            onChange={(e) => setQty(e.target.value)}
            className={fieldClass(showErrors && !!errors.qty)}
          />
          {showErrors && <FieldHint message={errors.qty} />}
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Date</span>
          <input
            type="date"
            value={date}
            min="1990-01-01"
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className={`${fieldClass(showErrors && !!errors.date)} scheme-light [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
          />
          {showErrors && <FieldHint message={errors.date} />}
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase">Reason</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe why you're making this trade…"
          rows={3}
          className={`w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 ${
            showErrors && errors.rationale
              ? "border-2 border-red-400 bg-white"
              : "border border-[#ebf0f5] bg-[#f4f6f9]"
          }`}
        />
        {showErrors && <FieldHint message={errors.rationale} />}
      </label>
    </div>
  );
}

function BuySellToggle({
  side,
  onSelect,
}: {
  side: "buy" | "sell" | null;
  onSelect: (side: "buy" | "sell") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect("buy")}
        className={`rounded-lg px-3.5 py-1.5 text-[13px] font-bold ${
          side === "sell" ? "bg-[#def7ec] text-[#03543f] opacity-50" : "bg-[#def7ec] text-[#03543f]"
        }`}
      >
        + Buy
      </button>
      <button
        type="button"
        onClick={() => onSelect("sell")}
        className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold ${
          side === "buy" ? "bg-[#fde8e8] text-[#9b1c1c] opacity-50" : "bg-[#fde8e8] text-[#9b1c1c]"
        }`}
      >
        − Sell
      </button>
    </div>
  );
}

/**
 * Shows the stock's My Fair Value and lets the user switch which saved model
 * supplies it. The dropdown only lists models that produce a fair value, so a
 * reverse DCF never appears here.
 */
function FairValueControl({ symbol }: { symbol: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const valuationQuery = useQuery({
    queryKey: ["valuation", symbol],
    queryFn: () => api<ValuationWorkbench>(`/stocks/${symbol}/valuation`),
  });

  const setFairValue = useMutation({
    mutationFn: (method: ValuationMethod) =>
      api(`/stocks/${symbol}/valuation/${method}/my-fair-value`, { method: "POST" }),
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["valuation", symbol] }),
        queryClient.invalidateQueries({ queryKey: ["watchlist"] }),
      ]);
    },
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const models = (valuationQuery.data?.models ?? []).filter(
    (model) => fairValueFromOutputs(model.outputs) != null,
  );
  const active = models.find((model) => model.isMyFairValue) ?? null;
  const activeValue = active ? fairValueFromOutputs(active.outputs) : null;

  return (
    <div ref={ref} className="relative shrink-0">
      <div className="flex items-stretch overflow-hidden rounded-lg border border-[#dbe3ec] bg-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={models.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 disabled:hover:bg-white"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <div className="min-w-0">
            <p className="text-[9px] leading-none font-semibold tracking-wide text-slate-400">my fair value</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[18px] leading-none font-bold text-blue-700">
                {activeValue == null ? "—" : formatPrice(activeValue)}
              </span>
              <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                {active ? VALUATION_METHOD_LABELS[active.method] : "not set"}
              </span>
            </div>
          </div>
          {models.length > 0 && (
            <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-slate-400" aria-hidden>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <Link
          href={`/stock/${symbol}/valuation`}
          className="flex items-center gap-1 bg-slate-900 px-3 text-[12px] font-semibold whitespace-nowrap text-white hover:bg-slate-800"
        >
          {models.length === 0 ? "+ Set Valuation" : "Open valuation"}
        </Link>
      </div>
      {open && models.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#ebf0f5] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.10)]">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              disabled={setFairValue.isPending}
              onClick={() => setFairValue.mutate(model.method)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left disabled:opacity-60 ${
                model.isMyFairValue ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <span
                className={`text-[13px] ${
                  model.isMyFairValue ? "font-semibold text-blue-600" : "text-slate-600"
                }`}
              >
                {VALUATION_METHOD_LABELS[model.method]}
              </span>
              <span className="text-[13px] font-bold text-slate-800">
                {formatPrice(fairValueFromOutputs(model.outputs))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RateMyTransactionBar() {
  const [rated, setRated] = useState(false);

  if (!rated) {
    return (
      <div className="flex w-full flex-col items-center gap-3 border-t border-[#ebf0f5] pt-[22px] pb-6">
        <div className="relative flex items-center justify-center">
          <div className="pointer-events-none absolute size-[76px] rounded-full bg-blue-600" style={{ animation: "rateRipple 2s ease-out infinite" }} />
          <div
            className="pointer-events-none absolute size-[76px] rounded-full bg-blue-600"
            style={{ animation: "rateRipple 2s ease-out infinite 0.7s" }}
          />
          <button
            type="button"
            onClick={() => setRated(true)}
            className="relative flex size-[76px] items-center justify-center rounded-full text-white shadow-[0_6px_24px_rgba(37,99,235,0.35)] transition-transform hover:scale-[1.07] active:scale-95"
            style={{ background: "linear-gradient(145deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%)" }}
            aria-label="Rate my transaction"
          >
            <svg width="26" height="26" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8L10 2z" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[13px] font-semibold tracking-tight text-slate-800">Rate My Transaction</span>
          <span className="text-[11px] text-slate-400">Let AI judge this trade</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 border-t border-[#ebf0f5] pt-[22px] pb-6">
      <div className="relative flex items-center justify-center">
        <div
          className="flex size-[76px] flex-col items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)",
            boxShadow: "0 0 0 3px #2563eb, 0 6px 20px rgba(37,99,235,0.22)",
          }}
        >
          <span className="text-[28px] leading-none font-bold text-blue-800">78</span>
          <span className="mt-0.5 text-[9px] tracking-wide text-blue-300">/100</span>
        </div>
        <button
          type="button"
          title="Re-rate"
          onClick={() => setRated(false)}
          className="absolute -top-0.5 -right-0.5 flex size-[22px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
        >
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 2l2.4 5 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.7.9-5.5L2 7.8l5.6-.8L10 2z"
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </svg>
        </button>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">Rate My Transaction</span>
        <p className="px-8 text-center text-[13px] font-medium text-slate-700">
          Strong reasoning — but your evidence base is thin for the growth assumption.
        </p>
      </div>
    </div>
  );
}

function EventsCard({ ticker }: { ticker: string }) {
  const items = JUDGMENT_ITEMS.filter((item) => item.title.toUpperCase().includes(ticker));
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[#ebf0f5] bg-white p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-[16px] font-bold text-slate-800">Important Events</p>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
          Needs judgment
        </span>
      </div>
      <div className="flex flex-col">
        {items.map((evt) => (
          <div key={evt.id} className="flex items-start gap-3 rounded-[10px] px-2 py-3 hover:bg-slate-50 md:px-3">
            <span className={`mt-1 size-2 shrink-0 rounded-full ${evt.dotColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{evt.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{evt.teaser}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StockDetail({ ticker }: { ticker: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [txnDraft, setTxnDraft] = useState<
    { mode: "create"; side: "buy" | "sell" } | { mode: "edit"; id: string; side: "buy" | "sell" } | null
  >(null);
  const [txnOpen, setTxnOpen] = useState(true);
  const symbol = ticker.toUpperCase();

  const detailQuery = useQuery({
    queryKey: ["stock", symbol],
    queryFn: () => api<StockDetail>(`/stocks/${symbol}`),
  });

  const journalMutation = useMutation({
    mutationFn: (text: string) =>
      api(`/stocks/${symbol}/journal`, { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stock", symbol] }),
  });

  const updateJournal = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api(`/stocks/${symbol}/journal/${id}`, { method: "PATCH", body: JSON.stringify({ text }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stock", symbol] }),
  });

  const deleteJournal = useMutation({
    mutationFn: (id: string) => api(`/stocks/${symbol}/journal/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stock", symbol] }),
  });

  const txnBody = (input: { type: "buy" | "sell"; price: string; qty: string; date: string; rationale: string }) =>
    JSON.stringify({
      type: input.type,
      price: parseMoney(input.price),
      qty: parseQty(input.qty),
      date: input.date.trim() || undefined,
      rationale: input.rationale,
    });

  const saveTxn = useMutation({
    mutationFn: (input: { type: "buy" | "sell"; price: string; qty: string; date: string; rationale: string }) =>
      api(`/stocks/${symbol}/transactions`, { method: "POST", body: txnBody(input) }),
    onSuccess: () => {
      setTxnDraft(null);
      queryClient.invalidateQueries({ queryKey: ["stock", symbol] });
    },
  });

  const updateTxn = useMutation({
    mutationFn: (
      input: { id: string; type: "buy" | "sell"; price: string; qty: string; date: string; rationale: string },
    ) => api(`/stocks/${symbol}/transactions/${input.id}`, { method: "PATCH", body: txnBody(input) }),
    onSuccess: () => {
      setTxnDraft(null);
      queryClient.invalidateQueries({ queryKey: ["stock", symbol] });
    },
  });

  const data = detailQuery.data;
  const headerDate =
    data?.journal.at(-1)?.date ?? data?.transactions.at(-1)?.date ?? null;

  return (
    <div className="min-h-screen bg-[#f4f6f9] pb-[max(3rem,env(safe-area-inset-bottom))] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#ebf0f5] bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between gap-2 px-3 md:h-16 md:px-6">
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
                <p className="font-mono text-[16px] font-bold text-slate-900 md:text-lg">{symbol}</p>
                <span className="hidden h-4 w-px bg-[#ebf0f5] md:block" />
                <p className="hidden truncate text-[14px] text-slate-500 md:inline">{data?.stock.name ?? symbol}</p>
              </div>
              <p className="truncate text-[12px] text-slate-500 md:hidden">{data?.stock.name ?? symbol}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {headerDate && (
              <span className="text-[13px] text-slate-500 md:text-[14px]">{formatEntryDate(headerDate)}</span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-3 py-4 md:gap-6 md:px-6 md:py-6">
        {detailQuery.isError && (
          <p className="text-[13px] text-red-500">Couldn’t load this stock. Is the API running?</p>
        )}

        <section className="flex flex-col gap-5 rounded-2xl border border-[#ebf0f5] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[17px] font-bold text-slate-800">
                {symbol} · Journal
              </p>
              <p className="mt-0.5 text-[12px] text-slate-400">Your investment thesis & decision record</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {data?.journal.length ?? 0} {(data?.journal.length ?? 0) === 1 ? "entry" : "entries"}
            </span>
          </div>
          {data?.journal.map((entry, i) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              index={i}
              onDelete={() => deleteJournal.mutate(entry.id)}
              onSave={(text) => updateJournal.mutateAsync({ id: entry.id, text })}
            />
          ))}
          <NewEntryComposer
            ticker={symbol}
            priceLabel={formatPrice(data?.quote?.price ?? null, data?.quote?.currency)}
            peLabel={null}
            pending={journalMutation.isPending}
            onSave={(text) => journalMutation.mutate(text)}
          />
        </section>

        <section className="rounded-2xl border border-[#ebf0f5] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-5">
            <button
              type="button"
              onClick={() => setTxnOpen((v) => !v)}
              className="flex min-w-0 items-center gap-1.5 text-left"
            >
              <p className="text-[18px] font-bold text-slate-800">Transaction</p>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className={`shrink-0 transition-transform ${txnOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6L8 10L12 6" stroke="#8A99AD" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <FairValueControl symbol={symbol} />
          </div>
          {txnOpen && (
            <div className="flex flex-col gap-4 border-t border-[#ebf0f5] px-4 pt-4 pb-2 md:px-6">
              <BuySellToggle
                side={txnDraft?.mode === "create" ? txnDraft.side : null}
                onSelect={(side) => setTxnDraft({ mode: "create", side })}
              />
              {(data?.transactions ?? []).map((txn) =>
                txnDraft?.mode === "edit" && txnDraft.id === txn.id ? (
                  <EditingTransactionForm
                    key={txn.id}
                    side={txnDraft.side}
                    title="Editing · Record"
                    initial={txnFormValues(txn)}
                    pending={updateTxn.isPending}
                    onSideChange={(side) => setTxnDraft({ mode: "edit", id: txn.id, side })}
                    onCancel={() => setTxnDraft(null)}
                    onSave={(input) => updateTxn.mutate({ id: txn.id, ...input })}
                  />
                ) : (
                  <SavedTransaction
                    key={txn.id}
                    txn={txn}
                    onEdit={() => setTxnDraft({ mode: "edit", id: txn.id, side: txn.type })}
                  />
                ),
              )}
              {txnDraft?.mode === "create" && (
                <EditingTransactionForm
                  key="new"
                  side={txnDraft.side}
                  title="Editing · New record"
                  pending={saveTxn.isPending}
                  onSideChange={(side) => setTxnDraft({ mode: "create", side })}
                  onCancel={() => setTxnDraft(null)}
                  onSave={(input) => saveTxn.mutate(input)}
                />
              )}
            </div>
          )}
          <RateMyTransactionBar />
        </section>

        <EventsCard ticker={symbol} />
      </div>
    </div>
  );
}
