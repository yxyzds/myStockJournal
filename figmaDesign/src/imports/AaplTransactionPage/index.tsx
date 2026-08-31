import { useState } from "react";
import svgPaths from "./svg-ymm1ojrn1t";
import { useRouter } from "../../router";

function ArrowLeft() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-left">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="arrow-left">
          <path d={svgPaths.pe197860} id="Vector" stroke="#1E293B" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]" data-name="icon-container">
      <ArrowLeft />
    </div>
  );
}

function BackButton() {
  const { back } = useRouter();
  return (
    <button
      onClick={back}
      className="bg-[#f4f6f9] content-stretch flex items-start p-[8px] relative rounded-[100px] shrink-0 border-0 cursor-pointer hover:bg-[#ebf0f5] transition-colors"
      data-name="back-button"
    >
      <IconContainer />
    </button>
  );
}

function Separator() {
  return <div className="bg-[#ebf0f5] h-[16px] relative shrink-0 w-px" data-name="separator" />;
}

function TickerBadge() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="ticker-badge">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[18px] whitespace-nowrap">AAPL</p>
      <Separator />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Apple Inc.</p>
    </div>
  );
}

function HeaderLeft() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="header-left">
      <BackButton />
      <TickerBadge />
    </div>
  );
}

function EditButton() {
  return (
    <div className="bg-white content-stretch flex items-start px-[16px] py-[8px] relative rounded-[8px] shrink-0" data-name="edit-button">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[13px] whitespace-nowrap">Edit</p>
    </div>
  );
}

function HeaderBar() {
  return (
    <div className="bg-white content-stretch flex h-[64px] items-center justify-between px-[24px] relative shrink-0 w-full" data-name="header-bar">
      <div aria-hidden className="absolute border-[#ebf0f5] border-b border-solid inset-0 pointer-events-none" />
      <HeaderLeft />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Aug 27, 2026</p>
      <EditButton />
    </div>
  );
}

// ─── Journal archive types ────────────────────────────────────────────────────

// Snapshot of market data captured at the moment of archiving
type MarketSnapshot = { price: string; pe: string };

type JournalEntry = { id: number; date: string; text: string; snapshot?: MarketSnapshot };

// Live market data for AAPL (would come from API in production)
const AAPL_LIVE: MarketSnapshot = { price: "$201.32", pe: "21.5×" }; // Fwd P/E = 201.32 / 9.38

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1.5" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 4.5v6.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3 3.5l.7 7.5a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Journal entry card ───────────────────────────────────────────────────────

function JournalEntryCard({
  entry, index, onDelete,
}: { entry: JournalEntry; index: number; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSE_AT = 280;
  const long = entry.text.length > COLLAPSE_AT;
  const displayed = long && !expanded
    ? entry.text.slice(0, COLLAPSE_AT).trimEnd() + "…"
    : entry.text;

  return (
    <div className="w-full rounded-[14px] bg-white border border-[#e8eef5] overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>

      {/* Header strip */}
      <div className="flex items-center justify-between px-[18px] py-[12px] bg-[#f8fafc] border-b border-[#ebf0f5]">
        <div className="flex items-center gap-[10px]">
          {/* Entry number badge */}
          <div className="size-[22px] rounded-full bg-[#0f172a] flex items-center justify-center shrink-0">
            <span className="font-['Inter:Bold',sans-serif] font-bold text-white text-[10px]">
              {index + 1}
            </span>
          </div>
          <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#1e293b] text-[13px]">
            {entry.date}
          </span>
        </div>
        <button
          onClick={onDelete}
          title="Delete entry"
          className="text-[#cbd5e1] hover:text-[#ef4444] transition-colors border-0 bg-transparent cursor-pointer p-[5px] rounded-[6px] hover:bg-[#fef2f2]"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Body — journal text */}
      <div className="px-[18px] pt-[14px] pb-[12px]">
        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#334155] text-[14px] leading-[1.7] whitespace-pre-wrap">
          {displayed}
        </p>
        {long && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-[8px] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2563eb] text-[12px] border-0 bg-transparent cursor-pointer p-0 hover:underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Market snapshot footer */}
      {entry.snapshot && (
        <div className="flex items-center gap-[12px] px-[18px] py-[10px] bg-[#f8fafc] border-t border-[#ebf0f5]">
          <span className="font-['Inter:Bold',sans-serif] font-bold text-[#94a3b8] text-[10px] uppercase tracking-wide">
            At entry
          </span>
          <div className="flex items-center gap-[6px]">
            <span className="font-['JetBrains_Mono',monospace] font-semibold text-[#475569] text-[12px] tabular-nums">
              {entry.snapshot.price}
            </span>
            <span className="text-[#cbd5e1] text-[11px] select-none">·</span>
            <span className="font-['Inter:Bold',sans-serif] font-bold text-[#94a3b8] text-[10px] uppercase tracking-wide">
              Fwd P/E
            </span>
            <span className="font-['JetBrains_Mono',monospace] font-semibold text-[#475569] text-[12px] tabular-nums">
              {entry.snapshot.pe}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New entry composer ───────────────────────────────────────────────────────

function NewEntryComposer({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const hasText = text.trim().length > 0;
  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  function handleCommit() {
    if (!hasText) return;
    onSave(text);
    setText("");
  }

  return (
    <div className={`w-full rounded-[14px] border transition-all overflow-hidden ${
      focused
        ? "border-[#2563eb] shadow-[0_0_0_3px_#eff6ff]"
        : "border-[#e8eef5]"
    }`}>

      {/* "Writing at" context bar — today's market */}
      <div className="flex items-center justify-between px-[16px] py-[9px] bg-[#f8fafc] border-b border-[#ebf0f5]">
        <div className="flex items-center gap-[6px]">
          <div className="size-[7px] rounded-full bg-[#10b981]" />
          <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#475569] text-[11px]">
            New entry
          </span>
        </div>
        <div className="flex items-center gap-[8px]">
          <span className="font-['Inter:Bold',sans-serif] font-bold text-[#94a3b8] text-[10px] uppercase tracking-wide">
            Today
          </span>
          <span className="font-['JetBrains_Mono',monospace] font-semibold text-[#475569] text-[11px] tabular-nums">
            {AAPL_LIVE.price}
          </span>
          <span className="text-[#cbd5e1] text-[10px]">·</span>
          <span className="font-['Inter:Bold',sans-serif] font-bold text-[#94a3b8] text-[10px] uppercase tracking-wide">
            Fwd P/E
          </span>
          <span className="font-['JetBrains_Mono',monospace] font-semibold text-[#475569] text-[11px] tabular-nums">
            {AAPL_LIVE.pe}
          </span>
        </div>
      </div>

      {/* Writing area */}
      <div className="bg-white">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What's your thesis? What are you watching? What would change your mind?"
          rows={5}
          className="w-full resize-none bg-transparent border-0 px-[18px] pt-[14px] pb-[10px] font-['Inter:Regular',sans-serif] font-normal text-[14px] text-[#334155] placeholder:text-[#c0c9d6] leading-[1.7] outline-none"
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-[16px] py-[10px] bg-[#f8fafc] border-t border-[#ebf0f5]">
        <span className="font-['Inter:Regular',sans-serif] font-normal text-[#c0c9d6] text-[11px]">
          {hasText ? `${wordCount} word${wordCount !== 1 ? "s" : ""}` : "Snapshots price & P/E on save"}
        </span>
        <div className="flex items-center gap-[6px]">
          {hasText && (
            <button
              onClick={() => setText("")}
              className="px-[10px] py-[5px] rounded-[6px] font-['Inter:Medium',sans-serif] font-medium text-[#8a99ad] text-[12px] border-0 bg-transparent cursor-pointer hover:bg-[#ebf0f5] hover:text-[#475569] transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={handleCommit}
            disabled={!hasText}
            className={`flex items-center gap-[6px] px-[14px] py-[6px] rounded-[7px] border-0 cursor-pointer font-['Inter:Semi_Bold',sans-serif] font-semibold text-[12px] transition-colors ${
              hasText
                ? "bg-[#0f172a] text-white hover:bg-[#1e293b]"
                : "bg-[#f1f5f9] text-[#c0c9d6] cursor-not-allowed"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 6h9M7 2.5l3.5 3.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Save entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thoughts card ────────────────────────────────────────────────────────────

function ThoughtsCard() {
  const INITIAL_TEXT =
    "On-device intelligence should pull forward the iPhone upgrade cycle across the installed base. Services keeps compounding margins, and the developer ecosystem looks stickier than ever — this feels like a durable, multi-year refresh rather than a one-quarter bump.\n\nI sized the position modestly because the AI upgrade thesis is still early. The indicator I'm watching is whether Services growth stalls, or the AI features fail to move upgrades. Revisiting after next earnings.";

  const [entries, setEntries] = useState<JournalEntry[]>([
    { id: 1, date: "Aug 27, 2026", text: INITIAL_TEXT, snapshot: { price: "$201.32", pe: "21.5×" } },
  ]);
  const [nextId, setNextId] = useState(2);

  function archiveCurrent(text: string) {
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setEntries(prev => [...prev, { id: nextId, date: today, text, snapshot: AAPL_LIVE }]);
    setNextId(n => n + 1);
  }

  function deleteEntry(id: number) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div className="bg-white flex flex-col gap-[20px] items-start p-[24px] relative rounded-[16px] shrink-0 w-full"
      style={{ boxShadow: "0 0 0 1px #ebf0f5, 0 2px 8px rgba(15,23,42,0.04)" }}>

      {/* Header */}
      <div className="flex items-start justify-between w-full">
        <div>
          <div className="flex items-center gap-[8px] mb-[3px]">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="2" y="1" width="11" height="13" rx="2" stroke="#0f172a" strokeWidth="1.3" />
              <path d="M5 5h5M5 8h5M5 11h3" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#1e293b] text-[17px] leading-snug">
              AAPL · Journal
            </p>
          </div>
          <p className="font-['Inter:Regular',sans-serif] font-normal text-[#8a99ad] text-[12px]">
            Your investment thesis &amp; decision record
          </p>
        </div>
        <div className="bg-[#f1f5f9] px-[8px] py-[3px] rounded-[6px] shrink-0">
          <span className="font-['Inter:Bold',sans-serif] font-bold text-[#475569] text-[11px]">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </div>

      {/* Timeline of past entries — newest last */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-[12px] w-full">
          {entries.map((entry, i) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              index={i}
              onDelete={() => deleteEntry(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Composer — always visible */}
      <NewEntryComposer onSave={archiveCurrent} />
    </div>
  );
}

// ─── Valuation methods data ───────────────────────────────────────────────────

type ValuationMethod = {
  id: string;
  label: string;
  value: string;
  note: string;
};

const VALUATION_METHODS: ValuationMethod[] = [
  { id: "pe",       label: "P/E Band",    value: "$225", note: "Preferred · Aug 20" },
  { id: "dcf",      label: "DCF",         value: "$235", note: "Base case · Aug 12" },
  { id: "evebitda", label: "EV/EBITDA",   value: "$210", note: "" },
  { id: "sotp",     label: "SOTP",        value: "$247", note: "" },
  { id: "rdcf",     label: "Reverse DCF", value: "—",    note: "Market implies 9.5% growth" },
];

// ─── Valuation dropdown ───────────────────────────────────────────────────────

function ValuationDropdown() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("pe");

  const selected = VALUATION_METHODS.find(m => m.id === selectedId)!;

  function select(id: string) {
    setSelectedId(id);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" data-name="valuation-dropdown">
      {/* trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-[8px] bg-[#f4f6f9] hover:bg-[#ebf0f5] transition-colors px-[12px] py-[6px] rounded-[8px] border-0 cursor-pointer"
      >
        <span className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic text-[#475569] text-[10px] uppercase whitespace-nowrap tracking-wide">
          REF:
        </span>
        <span className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic text-[#2563eb] text-[10px] uppercase whitespace-nowrap">
          {selected.label}
        </span>
        <span className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic text-[#2563eb] text-[10px] whitespace-nowrap">
          ({selected.value})
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* dropdown menu */}
      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-20 bg-white rounded-[12px] overflow-hidden min-w-[260px]"
          style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.10), 0 0 0 1px #ebf0f5" }}
        >
          {VALUATION_METHODS.map(m => {
            const isSelected = m.id === selectedId;
            return (
              <button
                key={m.id}
                onClick={() => select(m.id)}
                className={`flex items-center justify-between w-full px-[16px] py-[11px] border-0 cursor-pointer transition-colors text-left
                  ${isSelected ? "bg-[#eff6ff]" : "bg-white hover:bg-[#f8fafc]"}`}
              >
                <div className="flex items-center gap-[10px]">
                  {/* radio dot */}
                  <div className={`size-[14px] rounded-full border-[1.5px] flex items-center justify-center shrink-0
                    ${isSelected ? "border-[#2563eb]" : "border-[#8a99ad]"}`}>
                    {isSelected && <div className="size-[6px] rounded-full bg-[#2563eb]" />}
                  </div>
                  <span className={`[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic text-[13px] whitespace-nowrap
                    ${isSelected ? "text-[#2563eb] font-semibold" : "text-[#475569]"}`}>
                    {m.label}
                  </span>
                </div>
                <div className="flex items-center gap-[6px]">
                  {m.value !== "—" && (
                    <span className={`font-['Inter:Bold',sans-serif] font-bold text-[13px] ${isSelected ? "text-[#2563eb]" : "text-[#1e293b]"}`}>
                      {m.value}
                    </span>
                  )}
                  {m.note && (
                    <span className="font-['Inter:Regular',sans-serif] font-normal text-[11px] text-[#8a99ad] whitespace-nowrap">
                      {m.note}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Important Events card ────────────────────────────────────────────────────

type EventItem = {
  dotColor: string;
  title: string;
  teaser: string;
  urgency: "high" | "medium" | "low";
};

const IMPORTANT_EVENTS: EventItem[] = [
  {
    dotColor: "#f59e0b",
    title: "Review NVDA growth assumption",
    teaser: "AI CapEx slowed; your DCF still assumes 30% FCF growth.",
    urgency: "high",
  },
  {
    dotColor: "#3b82f6",
    title: "GOOGL 10-K filed",
    teaser: "New annual filing — your thesis has two open questions.",
    urgency: "medium",
  },
  {
    dotColor: "#94a3b8",
    title: "MSFT exit — outcome review",
    teaser: "You sold MSFT at $385. It's now $412. Was the call right?",
    urgency: "low",
  },
];

const URGENCY_LABEL: Record<EventItem["urgency"], { text: string; bg: string; fg: string }> = {
  high:   { text: "Action needed", bg: "#fffbeb", fg: "#b45309" },
  medium: { text: "Review",        bg: "#eff6ff", fg: "#2563eb" },
  low:    { text: "Reflect",       bg: "#f4f6f9", fg: "#475569" },
};

function ImportantEventsCard() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[16px] items-start p-[24px] relative rounded-[16px] shrink-0 w-full" data-name="important-events-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      {/* header */}
      <div className="content-stretch flex items-center gap-[8px] relative shrink-0 w-full">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
          <path d="M7 1.5v1M7 11.5v1M2.05 4l.87.5M11.08 9.5l.87.5M2.05 10l.87-.5M11.08 4.5l.87-.5M1.5 7h1M11.5 7h1" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="7" cy="7" r="2.5" stroke="#f59e0b" strokeWidth="1.3" />
        </svg>
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[16px]">Important Events</p>
        <div className="ml-auto bg-[#fffbeb] px-[8px] py-[3px] rounded-[100px] shrink-0">
          <p className="font-['Inter:Bold',sans-serif] font-bold text-[#b45309] text-[10px] uppercase whitespace-nowrap">Needs judgment</p>
        </div>
      </div>

      {/* event list */}
      <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full">
        {IMPORTANT_EVENTS.map((evt, i) => {
          const badge = URGENCY_LABEL[evt.urgency];
          return (
            <div
              key={i}
              className="flex items-start gap-[12px] px-[12px] py-[12px] rounded-[10px] w-full hover:bg-[#f8fafc] transition-colors cursor-pointer group"
            >
              {/* colored dot */}
              <div className="shrink-0 mt-[3px]">
                <div className="size-[8px] rounded-full" style={{ background: evt.dotColor }} />
              </div>
              {/* text */}
              <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[13px]">
                  {evt.title}
                </p>
                <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#475569] text-[12px]">
                  {evt.teaser}
                </p>
              </div>
              {/* urgency badge */}
              <div
                className="shrink-0 px-[8px] py-[3px] rounded-[6px] mt-[1px]"
                style={{ background: badge.bg }}
              >
                <p className="font-['Inter:Bold',sans-serif] font-bold text-[10px] uppercase whitespace-nowrap" style={{ color: badge.fg }}>
                  {badge.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TransCardHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-center leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-name="trans-card-header">
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b] text-[18px]">Transaction</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569] text-[12px]">Transaction attached to this entry</p>
    </div>
  );
}

function BuyBadgeActive() {
  return (
    <div className="bg-[#def7ec] content-stretch flex items-center px-[16px] py-[8px] relative rounded-[8px] shrink-0" data-name="buy-badge-active">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#03543f] text-[13px] whitespace-nowrap">+ Buy</p>
    </div>
  );
}

function SellBadge() {
  return (
    <div className="bg-[#fde8e8] content-stretch flex items-center opacity-60 px-[16px] py-[8px] relative rounded-[8px] shrink-0" data-name="sell-badge">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#9b1c1c] text-[13px] whitespace-nowrap">- Sell</p>
    </div>
  );
}

function BuySellToggle() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="buy-sell-toggle">
      <BuyBadgeActive />
      <SellBadge />
    </div>
  );
}


function RecordMetrics({ price, qty, date, valueColor }: { price: string; qty: string; date: string; valueColor: string }) {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
      {[["PRICE", price], ["QUANTITY", qty], ["DATE", date]].map(([label, val]) => (
        <div key={label} className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Bold',sans-serif] font-bold gap-[4px] items-start leading-[normal] not-italic relative shrink-0 whitespace-nowrap">
          <p className="relative shrink-0 text-[#8a99ad] text-[11px] uppercase">{label}</p>
          <p className="relative shrink-0 text-[16px]" style={{ color: valueColor }}>{val}</p>
        </div>
      ))}
    </div>
  );
}

function BuyTransactionRecord() {
  return (
    <div className="bg-[#f0fdf4] content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-full" data-name="buy-transaction-record">
      <div aria-hidden className="absolute border border-[#bbf7d0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="bg-[#dcfce7] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0">
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#15803d] text-[10px] uppercase whitespace-nowrap">TRANSACTION • BUY</p>
      </div>
      <RecordMetrics price="$201.32" qty="25 shares" date="Aug 27, 2026" valueColor="#1e293b" />
      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full pt-[12px]">
        <div aria-hidden className="absolute border-[#bbf7d0] border-solid border-t inset-0 pointer-events-none" />
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[11px] uppercase whitespace-nowrap">REASON</p>
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.55] not-italic relative shrink-0 text-[#475569] text-[13px] w-full">Valuation supported by P/E band; strong services margin growth expected to sustain through next cycle.</p>
      </div>
    </div>
  );
}

function SellTransactionRecord() {
  return (
    <div className="bg-[#fff1f2] content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[12px] shrink-0 w-full" data-name="sell-transaction-record">
      <div aria-hidden className="absolute border border-[#fecdd3] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="bg-[#ffe4e6] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0">
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#be123c] text-[10px] uppercase whitespace-nowrap">TRANSACTION • SELL</p>
      </div>
      <RecordMetrics price="$218.50" qty="10 shares" date="Sep 3, 2026" valueColor="#be123c" />
      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full pt-[12px]">
        <div aria-hidden className="absolute border-[#fecdd3] border-solid border-t inset-0 pointer-events-none" />
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#fda4af] text-[11px] uppercase whitespace-nowrap">REASON</p>
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.55] not-italic relative shrink-0 text-[#be123c] text-[13px] w-full">Trimmed position after 8% rally above fair value target; locking in gains ahead of earnings uncertainty.</p>
      </div>
    </div>
  );
}

function EditingTransactionRecord() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[14px] items-start p-[16px] relative rounded-[12px] shrink-0 w-full" data-name="editing-transaction-record">
      <div aria-hidden className="absolute border-2 border-[#2563eb] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      {/* header row */}
      <div className="content-stretch flex items-center justify-between relative shrink-0 w-full">
        <div className="bg-[#eff6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#2563eb] text-[10px] uppercase whitespace-nowrap">EDITING • NEW RECORD</p>
        </div>
        <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
          <div className="bg-[#f4f6f9] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer">
            <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#475569] text-[12px] whitespace-nowrap">Cancel</p>
          </div>
          <div className="bg-[#2563eb] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer">
            <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-white text-[12px] whitespace-nowrap">Save</p>
          </div>
        </div>
      </div>
      {/* type toggle inline */}
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <div className="bg-[#def7ec] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#03543f] text-[12px] whitespace-nowrap">+ Buy</p>
        </div>
        <div className="bg-[#f4f6f9] content-stretch flex items-center opacity-50 px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer">
          <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#475569] text-[12px] whitespace-nowrap">- Sell</p>
        </div>
      </div>
      {/* input fields */}
      <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full">
        {/* price */}
        <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 flex-1">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[11px] uppercase whitespace-nowrap">PRICE</p>
          <div className="bg-white content-stretch flex items-center px-[12px] py-[8px] relative rounded-[8px] shrink-0 w-full">
            <div aria-hidden className="absolute border-2 border-[#2563eb] border-solid inset-0 pointer-events-none rounded-[8px]" />
            <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[14px]">$—</p>
          </div>
        </div>
        {/* qty */}
        <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 flex-1">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[11px] uppercase whitespace-nowrap">QUANTITY</p>
          <div className="bg-[#f4f6f9] content-stretch flex items-center px-[12px] py-[8px] relative rounded-[8px] shrink-0 w-full">
            <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[8px]" />
            <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[14px]">0 shares</p>
          </div>
        </div>
        {/* date */}
        <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 flex-1">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[11px] uppercase whitespace-nowrap">DATE</p>
          <div className="bg-[#f4f6f9] content-stretch flex items-center px-[12px] py-[8px] relative rounded-[8px] shrink-0 w-full">
            <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[8px]" />
            <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[14px]">Select date</p>
          </div>
        </div>
      </div>
      {/* reason textarea */}
      <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full">
        <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[11px] uppercase whitespace-nowrap">REASON</p>
        <div className="bg-[#f4f6f9] content-stretch flex items-start px-[12px] py-[10px] relative rounded-[8px] shrink-0 w-full min-h-[64px]">
          <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[8px]" />
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.55] not-italic relative shrink-0 text-[#8a99ad] text-[13px]">Describe why you're making this trade…</p>
        </div>
      </div>
    </div>
  );
}

function SetValuationButton() {
  const { navigate } = useRouter();
  return (
    <button
      onClick={() => navigate("/valuation/aapl")}
      className="flex items-center gap-[6px] bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] transition-colors px-[12px] py-[6px] rounded-[8px] border-0 cursor-pointer shrink-0"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 2v8M2 6h8" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <span className="font-['Inter:Bold',sans-serif] font-bold text-white text-[10px] uppercase tracking-wide whitespace-nowrap">
        Set Valuation
      </span>
    </button>
  );
}

function TransactionCard() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative rounded-[16px] shrink-0 w-full overflow-hidden" data-name="transaction-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      {/* collapsible header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="content-stretch flex items-center justify-between px-[24px] py-[20px] relative shrink-0 w-full text-left bg-transparent border-0 cursor-pointer"
      >
        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#1e293b] text-[18px]">Transaction</p>
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#475569] text-[12px]">Transaction attached to this entry</p>
        </div>
        <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
          {collapsed && (
            <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
              <div className="bg-[#dcfce7] px-[8px] py-[3px] rounded-[100px] shrink-0">
                <p className="font-['Inter:Bold',sans-serif] font-bold text-[#15803d] text-[10px] uppercase whitespace-nowrap">BUY</p>
              </div>
              <div className="bg-[#ffe4e6] px-[8px] py-[3px] rounded-[100px] shrink-0">
                <p className="font-['Inter:Bold',sans-serif] font-bold text-[#be123c] text-[10px] uppercase whitespace-nowrap">SELL</p>
              </div>
              <div className="bg-[#eff6ff] px-[8px] py-[3px] rounded-[100px] shrink-0">
                <p className="font-['Inter:Bold',sans-serif] font-bold text-[#2563eb] text-[10px] uppercase whitespace-nowrap">DRAFT</p>
              </div>
            </div>
          )}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}>
            <path d="M4 6L8 10L12 6" stroke="#8A99AD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {/* expandable body */}
      {!collapsed && (
        <div className="content-stretch flex flex-col gap-[16px] items-start px-[24px] pb-[24px] relative shrink-0 w-full">
          <div aria-hidden className="absolute border-[#ebf0f5] border-solid border-t inset-0 pointer-events-none" />
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0 pt-[16px] flex-wrap">
            <BuySellToggle />
            <ValuationDropdown />
            <SetValuationButton />
          </div>
          <BuyTransactionRecord />
          <SellTransactionRecord />
          <EditingTransactionRecord />
        </div>
      )}
    </div>
  );
}

function LeftColumn() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[680px]" data-name="left-column">
      <ThoughtsCard />
      <TransactionCard />
      <ImportantEventsCard />
    </div>
  );
}

function Award() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="award">
          <path d={svgPaths.p3c35c300} id="Vector" stroke="#2563EB" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]" data-name="icon-container">
      <Award />
    </div>
  );
}

function ScoringTop() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-name="scoring-top">
      <IconContainer1 />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#2563eb] text-[12px] whitespace-nowrap">Rate My Transaction</p>
    </div>
  );
}

function ScoreDisplay() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[4px] items-baseline leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-name="score-display">
      <p className="font-['Inter:Extra_Bold',sans-serif] font-extrabold relative shrink-0 text-[#1e293b] text-[56px]">78</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#8a99ad] text-[20px]">/ 100</p>
    </div>
  );
}

function BreakdownRow() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="breakdown-row">
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569]">Valuation</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b]">86</p>
    </div>
  );
}

function BreakdownRow1() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="breakdown-row">
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569]">Thesis Alignment</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b]">81</p>
    </div>
  );
}

function WarningPill() {
  return (
    <div className="bg-[#b45309] content-stretch flex items-start px-[8px] py-[2px] relative rounded-[4px] shrink-0" data-name="warning-pill">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[11px] text-white whitespace-nowrap">50</p>
    </div>
  );
}

function BreakdownRow2() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="breakdown-row">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#475569] text-[13px] whitespace-nowrap">Evidence</p>
      <WarningPill />
    </div>
  );
}

function BreakdownRow3() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="breakdown-row">
      <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#475569]">Risk Management</p>
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[#1e293b]">73</p>
    </div>
  );
}

function BreakdownList() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="breakdown-list">
      <BreakdownRow />
      <BreakdownRow1 />
      <BreakdownRow2 />
      <BreakdownRow3 />
    </div>
  );
}

function BreakdownContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="breakdown-container">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#8a99ad] text-[10px] tracking-[0.005px] uppercase whitespace-nowrap">BREAKDOWN</p>
      <BreakdownList />
    </div>
  );
}

function ChallengeAlertBox() {
  return (
    <div className="bg-[#fffbeb] content-stretch flex flex-col gap-[8px] items-start p-[16px] relative rounded-[12px] shrink-0 w-full" data-name="challenge-alert-box">
      <div aria-hidden className="absolute border border-[#fde68a] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#b45309] text-[10px] tracking-[0.005px] uppercase whitespace-nowrap">AI CHALLENGE</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] min-w-full not-italic relative shrink-0 text-[#b45309] text-[13px] w-[min-content]">Your growth assumption sits above the 5Y average. What evidence would justify it?</p>
    </div>
  );
}

function CtaRateButton() {
  return (
    <div className="bg-[#2563eb] content-stretch drop-shadow-[0px_8px_8px_rgba(37,99,235,0.25)] flex flex-col items-center justify-center relative rounded-[100px] shrink-0 size-[100px]" data-name="cta-rate-button">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[15px] text-white whitespace-nowrap">Rate</p>
    </div>
  );
}

function ScoringCard() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[24px] items-center p-[24px] relative rounded-[16px] shrink-0 w-full" data-name="scoring-card">
      <div aria-hidden className="absolute border border-[#ebf0f5] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <ScoringTop />
      <ScoreDisplay />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] min-w-full not-italic relative shrink-0 text-[#475569] text-[13px] text-center w-[min-content]">Strong reasoning, one mild gap in evidence.</p>
      <BreakdownContainer />
      <ChallengeAlertBox />
      <CtaRateButton />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] min-w-full not-italic relative shrink-0 text-[#2563eb] text-[12px] text-center w-[min-content]">What would change this score?</p>
    </div>
  );
}

function RightColumn() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[348px]" data-name="right-column">
      <ScoringCard />
    </div>
  );
}

function ContentContainer() {
  return (
    <div className="content-stretch flex gap-[24px] items-start pt-[24px] px-[24px] relative shrink-0 w-full" data-name="content-container">
      <LeftColumn />
      <RightColumn />
    </div>
  );
}

export default function AaplTransactionPage() {
  return (
    <div className="bg-[#f4f6f9] content-stretch flex flex-col items-start pb-[48px] relative size-full" data-name="aapl-transaction-page">
      <HeaderBar />
      <ContentContainer />
    </div>
  );
}